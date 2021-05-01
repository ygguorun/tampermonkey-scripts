// ==UserScript==
// @name         Bilibili 风纪委员投票
// @namespace    Bilibili
// @version      0.7.2
// @change-log   0.7.2 修改裁决结果判定策略
// @change-log   0.7.1 修改票数获取方法
// @change-log   0.7 fix任务完成后首页依旧打开投票问题
// @change-log   0.6 添加匿名投票功能（原本就是匿名投票）、当日投票完成后自动关闭开关
// @change-log   0.5 添加投票补偿、描述性文字
//               案件刚开始审理时投票不多，少量票数不能反映总体趋势，添加补偿票数减少
//               和主流意见差异。处理案件过程中在界面Slogan UI上添加描述状态的文字
// @change-log   0.4 添加配置提交内容及投票间隔UI
// @author       ygguorun
// @description  选择多数意见进行投票
// @license      MIT
// @homepage     https://github.com/ygguorun/tampermonkey-scripts
// @icon         https://www.bilibili.com/favicon.ico
// @match        https://www.bilibili.com
// @match        https://www.bilibili.com/judgement*
// @grant        window.close
// @grant        GM_openInTab
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// ==/UserScript==

(function () {
    'use strict';

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */

    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    const setValue = GM_setValue;
    const getValue = GM_getValue;
    const deleteValue = GM_deleteValue;
    const openInTab = GM_openInTab;

    function getCookie(name) {
        return getCookieMap()[name];
    }
    function getCookieMap() {
        return document.cookie
            .split('; ')
            .map((item) => item.split('='))
            .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
        }, {});
    }

    var JudgementCode;
    (function (JudgementCode) {
        JudgementCode[JudgementCode["NoCase"] = 25008] = "NoCase";
        JudgementCode[JudgementCode["Finished"] = 25014] = "Finished";
    })(JudgementCode || (JudgementCode = {}));
    function isFJWer() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield fetch('//api.bilibili.com/x/credit/jury/jury', {
                method: 'GET',
                mode: 'cors',
                credentials: 'include',
            });
            const result = yield response.json();
            return [result.code === 0, result.code];
        });
    }
    function getCaseID() {
        return __awaiter(this, void 0, void 0, function* () {
            const csrf = getCookie('bili_jct');
            const response = yield fetch('//api.bilibili.com/x/credit/jury/caseObtain', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                },
                mode: 'cors',
                credentials: 'include',
                body: `jsonp=jsonp&csrf=${csrf}`,
            });
            const result = yield response.json();
            return [result.code === 0 ? result.data.id : -1, result.code];
        });
    }
    var VoteType;
    (function (VoteType) {
        VoteType[VoteType["Approve"] = 0] = "Approve";
        VoteType[VoteType["Refuse"] = 1] = "Refuse";
    })(VoteType || (VoteType = {}));
    class Counts {
    }
    function getVoteCount(cid) {
        return __awaiter(this, void 0, void 0, function* () {
            let counts = new Counts;
            const response = yield fetch(`https://api.bilibili.com/x/credit/jury/caseInfo?cid=${cid}`, {
                method: 'GET',
                mode: 'cors',
                credentials: 'include',
            });
            const result = yield response.json();
            counts.voteRule = yield result.data.voteRule;
            counts.voteBreak = yield result.data.voteBreak;
            counts.voteDelete = yield result.data.voteDelete;
            return [counts, result.code];
        });
    }
    function vote(cid, config) {
        return __awaiter(this, void 0, void 0, function* () {
            const judgeResult = String(config.judgeResult);
            const anonymous = config.anonymous ? 0 : 1;
            const content = encodeURIComponent(config.content);
            const csrf = getCookie('bili_jct');
            const response = yield fetch('//api.bilibili.com/x/credit/jury/vote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                },
                mode: 'cors',
                credentials: 'include',
                body: `cid=${cid}&vote=${judgeResult}&content=${content}&attr=${anonymous}&csrf=${csrf}`,
            });
            const result = yield response.json();
            return [result.code === 0, result.code];
        });
    }

    class Config {
        set approveText(text) {
            setValue('approve_text', text);
        }
        get approveText() {
            return getValue('approve_text', '');
        }
        set refuseText(text) {
            setValue('refuse_text', text);
        }
        get refuseText() {
            return getValue('refuse_text', '');
        }
        set approveAlter(alter) {
            setValue('approve_alter', alter);
        }
        get approveAlter() {
            return getValue('approve_alter', Config.APPROVE_ALTER);
        }
        set anonymous(anonymous) {
            setValue('anonymous', anonymous);
        }
        get anonymous() {
            return getValue('anonymous', Config.ANONYMOUS);
        }
        set autoClose(autoClose) {
            setValue('auto_close', autoClose);
        }
        get autoClose() {
            return getValue('auto_close', Config.AUTO_CLOSE);
        }
        set voteMinInterval(interval) {
            setValue('min_interval', interval >= 0 ? interval : 0);
        }
        get voteMinInterval() {
            return getValue('min_interval', Config.MIN_INTERVAL);
        }
        set todayCompletedCount(count) {
            if (count < 0) {
                count = 0;
            }
            else if (count > Config.MAX_DAILY_CASE_COUNT) {
                count = Config.MAX_DAILY_CASE_COUNT;
            }
            setValue('today_completed_count', count);
        }
        get todayCompletedCount() {
            return getValue('today_completed_count', Config.MIN_INTERVAL);
        }
    }
    Config.APPROVE_ALTER = 2;
    Config.MIN_INTERVAL = 2000;
    Config.ANONYMOUS = true;
    Config.AUTO_CLOSE = true;
    Config.MAX_DAILY_CASE_COUNT = 20;
    const config = new Config();
    (() => {
        const approveAlter = getValue('approve_alter', null);
        if (approveAlter && typeof approveAlter === 'string') {
            config.approveAlter = parseInt(approveAlter, 10);
        }
        const todayCompletedCount = getValue('today_completed_count', null);
        if (todayCompletedCount !== null && typeof todayCompletedCount === 'string') {
            config.todayCompletedCount = parseInt(todayCompletedCount, 10);
        }
        const voteMinInterval = getValue('vote_min_interval', null);
        if (voteMinInterval !== null && typeof voteMinInterval === 'string') {
            config.voteMinInterval = parseInt(voteMinInterval, 10);
            deleteValue('vote_min_interval');
        }
        const refuseText = getValue('disapprove_text', null);
        if (refuseText !== null && typeof refuseText === 'string') {
            config.refuseText = refuseText;
            deleteValue('disapprove_text');
        }
        deleteValue('finish_day');
    })();

    function delay(timer) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => setTimeout(resolve, timer));
        });
    }

    window.onload = main;
    function main() {
        return __awaiter(this, void 0, void 0, function* () {
            if (location.pathname !== '/') {
                renderSetting();
            }
            if (!(yield isFJWer())[0]) {
                return;
            }
            if (location.pathname === '/') {
                const [cid, code] = yield getCaseID();
                if (code !== JudgementCode.Finished) {
                    openInTab(`//www.bilibili.com/judgement?cid=${cid}`, { insert: true });
                }
                return;
            }
            let queryCid = -1;
            try {
                const result = parseInt(location.search.replace('?', '').split('=')[1], 10);
                if (result > 0) {
                    queryCid = result;
                }
            }
            catch (_a) { }
            while (true) {
                setSlogan(`(${config.todayCompletedCount}/${Config.MAX_DAILY_CASE_COUNT})获取案件...`);
                let cid = -1;
                let code = -1;
                if (queryCid > 0) {
                    cid = queryCid;
                    queryCid = -1;
                }
                else {
                    const result = yield getCaseID();
                    cid = result[0];
                    code = result[1];
                }
                if (JudgementCode.NoCase === code) {
                    setSlogan(`(${config.todayCompletedCount}/${Config.MAX_DAILY_CASE_COUNT})当前无案件，5min 后自动重试`);
                    yield delay(5 * 60 * 1000);
                    continue;
                }
                if (JudgementCode.Finished === code) {
                    const enableClose = config.todayCompletedCount !== 0;
                    config.todayCompletedCount = 0;
                    setSlogan(`(${Config.MAX_DAILY_CASE_COUNT}/${Config.MAX_DAILY_CASE_COUNT})今日已完成任务`);
                    if (config.autoClose) {
                        if (enableClose) {
                            setTimeout(window.close, 0);
                        }
                    }
                    else {
                        setSlogan(`今日已完成，半小时后继续检查`);
                        yield delay(30 * 60 * 1000);
                        continue;
                    }
                    return;
                }
                setSlogan(`(${config.todayCompletedCount}/${Config.MAX_DAILY_CASE_COUNT})获取案件票数...`);
                let judgeResult = 4;
                for (let i = 0; i < 10; i++) {
                    const countResult = yield getVoteCount(cid);
                    if (countResult[1] !== 0) {
                        yield delay(10 * 1000);
                        continue;
                    }
                    const voteBreak = countResult[0].voteBreak;
                    const voteDelete = countResult[0].voteDelete;
                    const voteRule = countResult[0].voteRule;
                    const sum = voteBreak + voteDelete + voteRule;
                    setSlogan(`(${config.todayCompletedCount}/${Config.MAX_DAILY_CASE_COUNT})目前投票数${sum}`);
                    yield delay(3 * 1000);
                    if (sum < 300) {
                        yield delay(30 * 1000);
                        continue;
                    }
                    if (voteRule / sum >= 0.45)
                        judgeResult = 2;
                    else if (voteBreak / (voteBreak + voteDelete) >= 0.65)
                        judgeResult = 1;
                    else
                        judgeResult = 4;
                    break;
                }
                setSlogan(`(${config.todayCompletedCount}/${Config.MAX_DAILY_CASE_COUNT})案件投${judgeResult !== 2 ? '赞成' : '反对'}票...`);
                yield vote(cid, {
                    judgeResult,
                    anonymous: config.anonymous,
                    content: judgeResult !== 2 ? config.approveText : config.refuseText,
                });
                config.todayCompletedCount++;
                let intervel = config.voteMinInterval + Math.round(Math.random() * 2) * 1000;
                setSlogan(`(${config.todayCompletedCount}/${Config.MAX_DAILY_CASE_COUNT})${intervel}ms后处理下一案件`);
                yield delay(intervel);
            }
        });
    }
    function setSlogan(text) {
        const sloganEl = document.querySelector('.fjw-user .u-img');
        if (sloganEl) {
            sloganEl.innerText = text;
        }
    }
    function renderSetting() {
        const button = document.createElement('button');
        button.className = 'votescript-cfgbtn';
        button.innerText = '投票配置';
        let modal;
        button.addEventListener('click', () => {
            if (!modal) {
                modal = document.createElement('div');
                modal.className = 'votescript-modal';
                const form = createForm(() => {
                    modal.className = 'votescript-modal hide';
                });
                modal.appendChild(form);
                document.body.append(modal);
            }
            else {
                modal.className = 'votescript-modal';
            }
        });
        document.body.append(button);
        document.head.append(createStyle());
    }
    function createForm(hide) {
        const form = document.createElement('div');
        form.className = 'votescript-form';
        const approveRow = createInputRow('赞成描述:', '赞成描述', config.approveText);
        const refuseRow = createInputRow('反对描述:', '反对描述', config.refuseText);
        const approveAlterRow = createInputRow('赞成修正(判定投票结果时添加到赞成方):', '赞成修正', `${config.approveAlter}`);
        const anonymousRow = createInputRow('匿名投票(1匿名/0实名):', '匿名投票(1匿名/0实名)', `${config.anonymous ? 1 : 0}`);
        const autoCloseRow = createInputRow('当日完成后是否关闭(1关闭/0不关闭):', '当日完成后是否关闭(1关闭/0不关闭)', `${config.autoClose ? 1 : 0}`);
        const intervelRow = createInputRow('最小投票间隔(ms)(实际会额外增加0~2s):', '最小投票间隔(ms)', `${config.voteMinInterval}`);
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'votescript-buttongroup';
        const saveBtn = createButton('保存');
        saveBtn.addEventListener('click', () => {
            const approveInput = approveRow.lastElementChild;
            const approveText = approveInput.value.trim();
            config.approveText = approveText;
            approveInput.value = approveText;
            const refuseInput = refuseRow.lastElementChild;
            const refuseText = refuseInput.value.trim();
            config.refuseText = refuseText;
            refuseInput.value = refuseText;
            const approveAlterInput = approveAlterRow.lastElementChild;
            let approveAlter = parseInt(approveAlterInput.value, 10);
            config.approveAlter = approveAlter;
            approveAlterInput.value = `${approveAlter}`;
            const anonymousInput = anonymousRow.lastElementChild;
            let anonymous = parseInt(anonymousInput.value, 10);
            config.anonymous = anonymous === 1;
            anonymousInput.value = `${anonymous}`;
            const autoCloseInput = autoCloseRow.lastElementChild;
            let autoClose = parseInt(autoCloseInput.value, 10);
            config.autoClose = autoClose === 1;
            autoCloseInput.value = `${autoClose}`;
            const intervelInput = intervelRow.lastElementChild;
            let intervel = parseInt(intervelInput.value, 10);
            config.voteMinInterval = intervel;
            intervelInput.value = `${intervel}`;
            hide();
        });
        const cancelBtn = createButton('取消');
        cancelBtn.addEventListener('click', () => hide());
        buttonGroup.append(saveBtn, cancelBtn);
        form.append(approveRow, refuseRow, approveAlterRow, anonymousRow, autoCloseRow, intervelRow, buttonGroup);
        return form;
    }
    function createInputRow(labelText, inputPlaceholder, inputValue) {
        const row = document.createElement('div');
        row.className = 'votescript-row';
        const label = document.createElement('label');
        label.innerText = labelText;
        label.className = 'votescript-label';
        const input = document.createElement('input');
        input.value = inputValue;
        input.placeholder = inputPlaceholder;
        input.className = 'votescript-input';
        row.append(label, input);
        return row;
    }
    function createButton(text) {
        const button = document.createElement('button');
        button.className = 'votescript-btn';
        button.innerText = text;
        return button;
    }
    function createStyle() {
        const style = document.createElement('style');
        style.type = 'text/css';
        style.appendChild(document.createTextNode(`
.votescript-cfgbtn {
  -webkit-appearance: none;
  position: fixed;
  bottom: 20px;
  right: 0px;
  width: 100px;
  height: 32px;
  line-height: 32px;
  background-color: #00a1d6;
  border: none;
  border-radius: 4px;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}

.votescript-modal {
  position: fixed;
  z-index: 1000;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.3);
}

.votescript-modal.hide {
  display: none;
}

.votescript-form {
  box-sizing: border-box;
  width: 500px;
  margin: 100px auto 0;
  padding: 15px;
  background-color: #fff;
  border-radius: 5px;
}

.votescript-row {
  margin: 10px 0;
}

.votescript-buttongroup {
  margin-top: 20px;
}

.votescript-btn {
  -webkit-appearance: none;
  margin-right: 10px;
  padding: 4px 12px;
  border: none;
  border-radius: 3px;
  background-color: #00a1d6;
  color: #fff;
  cursor: pointer;
}

.votescript-label {
  display: inline-block;
  margin-bottom: 5px;
}

.votescript-input {
  -webkit-appearance: none;
  display: block;
  box-sizing: border-box;
  width: 100%;
  height: 30px;
  border: 1px solid #c1c1c1;
  border-radius: 3px;
  padding: 2px 5px;
}
`));
        return style;
    }

}());
