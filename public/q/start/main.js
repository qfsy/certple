//=================================================
//================= UI functions ==================
//=================================================
//LICENSE: GPL-3.0, https://github.com/xiangyuecn/ACME-HTML-Web-Browser-Client

// ===========================================
// ===== Modified by: Qiu (zeoseven.com) =====
// ===========================================

(function () {
    "use strict";
    var ChoiceAcmeURLStoreKey = "ACME_HTML_choice_acmeURL";
    var InputDomainsStoreKey = "ACME_HTML_input_domains";
    var InputEmailStoreKey = "ACME_HTML_input_email";
    var DropConfigFile = {}; //拖拽进来的上次配置文件

    /************** UI: Initialize on Launch **************/
    window.initMainUI = function () {
        $(".eccCurveNames").html(X509.SupportECCType2Names().join(Lang("、", ", ")));
        $(".donateBtnIco").html(unescape("%uD83D%uDE18"));
        $(".versionBox").html(Lang("版本: " + Version, ""));

        if (/mobile/i.test(navigator.userAgent)) {
            $(".main").prepend($(".langBtnBox").css("position", null));
            $(".donateWidget").css("position", null);
        }

        CLog("initMainUI", 0, Lang(
            `OK`,
            `OK`));

        initTest_Restore();
        acmeReadDirGotoCORSInit();
        downloadFileNameShow();
        initStep1();
        initStep2();
        initStep4();
    };
    var initStep1 = function () {
        $("input[name=choice_acmeURL]").bind("click", function (e) {
            var el = e.target;
            var isManual = el.value == "manual";
            $(".in_acmeURL").css("opacity", isManual ? 1 : 0.4)
                .val(isManual ? step1ChoiceStoreVal : el.value)
                .attr("readonly", isManual ? null : "");

            var descKey = $(el).attr("desckey");
            $(".descAcmeURL").hide();
            if (descKey) $("." + descKey).show();

            step1ChoiceStoreVal = "";
            choiceAcmeURLChangeAfter();
        });
        resetStep1();
    };
    var step1ChoiceStoreVal;
    var resetStep1 = function () {
        //选中上次选择的证书颁发机构
        step1ChoiceStoreVal = DropConfigFile.acmeURL || window.Default_ACME_URL || localStorage[ChoiceAcmeURLStoreKey] || "";
        var choices = $("input[name=choice_acmeURL]")
        var idx = 0;
        if (step1ChoiceStoreVal) {
            var manualIdx = 0;
            for (var i = 0; i < choices.length; i++) {
                if (choices[i].value == step1ChoiceStoreVal) idx = i + 1;
                if (choices[i].value == "manual") manualIdx = i + 1;
            }
            if (!idx) idx = manualIdx //手动填写
            idx--;
        }
        choices[idx].click();
    };
    var initStep2 = function () {
        //证书私钥UI
        $(".privateKeyBox").hide();
        $("input[name=choice_privateKey]").bind("click", function (e) {
            var el = e.target;
            var isManual = el.value == "manual";
            $(".in_privateKey").css("opacity", isManual ? 1 : 0.4)
                .val("")
                .attr("readonly", isManual ? null : "");
            $(".privateKeyBox").show();

            configPrivateKeyGenerate(el.value);//生成密钥
            configStepShow();//重新显示界面
        });

        //ACME账户私钥UI
        $(".accountKeyBox").hide();
        $("input[name=choice_accountKey]").bind("click", function (e) {
            var el = e.target;
            var isManual = el.value == "manual";
            $(".in_accountKey").css("opacity", isManual ? 1 : 0.4)
                .val("")
                .attr("readonly", isManual ? null : "");
            $(".accountKeyBox").show();

            configAccountKeyGenerate(el.value);//生成密钥
            configStepShow();//重新显示界面
        });
    };


    //下一步操作提示
    var NextStepTips = function () {
        return '<span>' + Lang("继续", " ") + '</span>';
    };
    //请稍候提示
    var PleaseWaitTips = function () {
        return Lang(" 请稍候... ", "");
    };
    //请重试提示
    var TryAgainTips = function () {
        return Lang(" 请重试！", "");
    };
    //每一步的状态更新显示
    var ShowState = function (elem, msg, color, tag) {
        var now = new Date();
        var t = ("0" + now.getHours()).substr(-2)
            + ":" + ("0" + now.getMinutes()).substr(-2)
            + ":" + ("0" + now.getSeconds()).substr(-2);
        $(elem).html(msg === false ? '' : '<div style="color:' + (!color ? "" : color == 1 ? "red" : color == 2 ? "#0b1" : color == 3 ? "#fa0" : color) + '">' + (tag == null ? '[' + t + '] ' : tag) + msg + '</div>');
        return msg;
    };
    window.Toast = function (msg, color, time) {
        ShowState(".toastState", msg, color, "");

        $(".toastState").show();
        clearTimeout(Toast._int);
        Toast._int = setTimeout(function () { $(".toastState").hide(); }, time || 5000);
    };
    window.onerror = function (message, url, lineNo, columnNo, error) {
        //https://www.cnblogs.com/xianyulaodi/p/6201829.html
        Toast('【Uncaught Error】' + message + '<pre>' + "at:" + lineNo + ":" + columnNo + " url:" + url + "\n" + (error && error.stack || "-") + '</pre>', 1, 15000);
    };



    //用户点击操作同步控制，新点击操作要终止之前未完成的操作
    var UserClickSyncID = 0;
    var UserClickSyncKill = function (id, tag, msg) {
        if (id != UserClickSyncID) {
            var abort = Lang("被终止", "", 1);
            CLog(tag + " " + abort, 3, "From: " + msg + " [" + abort + "]");
            return true;
        }
    };





    /************** UI Step1: Read ACME service directory **************/
    //证书颁发机构单选按钮点击后处理
    var choiceAcmeURLChangeAfter = function () {
        UserClickSyncID++;

        $(".step1Hide").hide();
        $(".step1Show").show();
        ShowState(".acmeReadDirState", false);

        if ($(".in_acmeURL").val()) acmeReadDirClick();
    };
    //点击读取服务目录按钮
    window.acmeReadDirClick = function () {
        var id = ++UserClickSyncID;

        $(".step1Hide").hide();
        $(".step1Show").show();
        var tag = "Step-1", sEl = ".acmeReadDirState";

        var url = $(".in_acmeURL").val().trim();
        if (!url) {
            ShowState(sEl, Lang("请填写服务URL！", ""), 1);
            return;
        }
        localStorage[ChoiceAcmeURLStoreKey] = url;
        url = ACME.URL = url.replace(/\/$/, "");

        var msg0 = CLog(tag, 0, ShowState(sEl, PleaseWaitTips() + Lang("正在初始化，", " ") + " URL=" + ACME.URL, 2));
        var reqDir = function () {
            ACME.Directory(function (cache, saveCache) {
                saveCacheCors = function (corsOK, err) {
                    cache.corsOK = corsOK ? 1 : -1;
                    cache.corsError = err || "";
                    saveCache();
                };
                if (cache.corsOK == 1) dirOK();//已缓存的，此ACME服务正常
                else if (cache.corsOK == -1) testCORSFail(cache.corsError, true);//不正常已缓存
                else testCORS();//检测是否能正常调用接口，是否支持跨域
            }, function (err, status) {
                if (UserClickSyncKill(id, tag, msg0 + " err: " + err)) return;
                if (status === 0) { //可能是跨域无法读取到任何数据
                    CLog(tag, 1, ShowState(sEl, Lang("初始化出错：无法访问此URL。", "") + TryAgainTips(), 1));

                    acmeReadDirGotoCORS(Lang("如果你可以在浏览器中直接打开并访问此ACME服务URL，代表此ACME服务对跨域访问支持不良，则请按下面步骤操作：", ""));
                } else {
                    CLog(tag, 1, ShowState(sEl, Lang("初始化出错：" + err, "") + TryAgainTips(), 1));
                };
            });
        };
        var saveCacheCors;
        var dirOK = function () {
            if (UserClickSyncKill(id, tag, msg0)) return;
            configStepShow();
            CLog(tag, 0, ShowState(sEl, Lang("正常，", " ")
                + NextStepTips(), 2), ACME.DirData);
        };

        //ZeroSSL接口跨域支持太差，发现这种就直接在他们网站里面跑
        var testCORS = function () {
            if (UserClickSyncKill(id, tag, msg0)) return;
            msg0 = CLog(tag, 0, ShowState(sEl, PleaseWaitTips() + Lang("正在测试浏览器支持情况，", "") + " URL=" + ACME.URL, 2));
            ACME.GetNonce(true, function () {
                ACME.TestAccountCORS(function () {
                    CLog(tag, 0, Lang("此 ACME 服务对浏览器的支持良好。", ""));
                    saveCacheCors(true);
                    dirOK();
                }, testCORSFail);
            }, function (err, corsFail) { //GetNonce 能明确检测到是否支持跨域可以缓存起来，账户地址可能是网络错误不缓存
                if (corsFail) saveCacheCors(false, err);
                testCORSFail(err, corsFail);
            });
        };
        var testCORSFail = function (err, corsFail) {
            if (UserClickSyncKill(id, tag, msg0 + " err: " + err)) return;
            CLog(tag, 1, ShowState(sEl, Lang(
                "测试此ACME服务对浏览器的支持情况，发生错误：" + err
                , "")
                + (corsFail ? "" : TryAgainTips()), 1));
            LangReview(sEl);//err from cache
            if (corsFail) acmeReadDirGotoCORS();
        };

        reqDir();
    };






    /************** UI Step2: Certificate Configuration **************/
    //显示第二步界面
    var configStepShow = function () {
        document.getElementById('q-steps1').style.display = 'none';
        document.getElementById('q-steps2').style.display = '';
        $(".step2Hide").hide();
        $(".step2Show").show();
        ShowState(".configStepState", false);

        $(".eabShow")[ACME.StepData.needEAB ? 'show' : 'hide']();
        if (DropConfigFile.eabKid) $(".in_eab_kid").val(DropConfigFile.eabKid);
        if (DropConfigFile.eabKey) $(".in_eab_key").val(DropConfigFile.eabKey);

        $(".termsAgreeBox")[ACME.StepData.termsURL ? 'show' : 'hide']();
        $(".termsAgreeTips").html(Lang('我同意此证书颁发机构ACME服务的<a href="' + ACME.StepData.termsURL + '" target="_blank">服务条款</a>。', ''));
        $(".choice_termsAgree").prop("checked", true);

        var el = $(".in_domains");//填充上次填写的域名列表
        var valS = localStorage[InputDomainsStoreKey];
        var val = DropConfigFile.domains && DropConfigFile.domains.join(", ") || valS;
        if (!el.val()) {
            el.val(val || "");
        }
        $(".choice_domains_store").prop("checked", !!valS);

        var el = $(".in_email");//填充上次填写的联系邮箱
        var valS = localStorage[InputEmailStoreKey];
        var val = DropConfigFile.email || valS;
        if (!el.val()) {
            el.val(val || "");
        }
        $(".choice_email_store").prop("checked", !!valS);

        var setKey = function (k) {
            if (DropConfigFile[k]) {
                $("input[name=choice_" + k + "][value=manual]")[0].click();
                $(".in_" + k).val(DropConfigFile[k]);
            }
        };
        setKey("privateKey"); setKey("accountKey");

        DropConfigFile = {};//配置完成，丢弃拖拽进来的配置信息
    };
    //生成证书的密钥对
    var configPrivateKeyGenerate = function (type) {
        var id = ++UserClickSyncID;
        var tag = "Step-2", sEl = ".privateKeyState";

        var keyTag = "", type2;
        if (type == "generateRSA") {
            type = "RSA"; type2 = X509.DefaultType2_RSA;
            keyTag = Lang("证书 RSA 私钥 (" + type2 + " Bit)", " ");
        } else if (type == "generateECC") {
            type = "ECC"; type2 = X509.DefaultType2_ECC; var type2N = X509.SupportECCType2[type2] || type2;
            keyTag = Lang("证书 ECC 私钥 (" + type2N + ")", " ");
        } else {
            ShowState(sEl, false);
            return;
        };

        var msg0 = CLog(tag, 0, ShowState(sEl, PleaseWaitTips() + Lang("正在创建", "") + keyTag, 2));
        X509.KeyGenerate(type, type2, function (pem) {
            if (UserClickSyncKill(id, tag, msg0)) return;
            $(".in_privateKey").val(pem);
            CLog(tag, 0, ShowState(sEl, keyTag + Lang("，创建成功。", ""), 2), '\n' + pem);
        }, function (err) {
            if (UserClickSyncKill(id, tag, msg0 + " err: " + err)) return;
            CLog(tag, 1, ShowState(sEl, keyTag + Lang("，发生错误：" + err, ""), 1));
        });
    };
    //生成ACME账户的密钥对
    var configAccountKeyGenerate = function (type) {
        var id = ++UserClickSyncID;
        var tag = "Step-2", sEl = ".accountKeyState";

        var keyTag = "", type2;
        if (type == "generateRSA") {
            type = "RSA"; type2 = X509.DefaultType2_RSA;
            keyTag = Lang("ACME 账户 RSA 私钥 (" + type2 + " Bit)", " ");
        } else if (type == "generateECC") {
            type = "ECC"; type2 = X509.DefaultType2_ECC; var type2N = X509.SupportECCType2[type2] || type2;
            keyTag = Lang("ACME 账户 ECC 私钥 (" + type2N + ")", " ");
        } else {
            ShowState(sEl, false);
            return;
        };

        var msg0 = CLog(tag, 0, ShowState(sEl, PleaseWaitTips() + Lang("正在创建", "") + keyTag, 2));
        X509.KeyGenerate(type, type2, function (pem) {
            if (UserClickSyncKill(id, tag, msg0)) return;
            $(".in_accountKey").val(pem);
            CLog(tag, 0, ShowState(sEl, keyTag + Lang("，创建成功，请复制保管，下次输入自己的账户私钥。", ""), 2), '\n' + pem);
        }, function (err) {
            if (UserClickSyncKill(id, tag, msg0 + " err: " + err)) return;
            CLog(tag, 1, ShowState(sEl, keyTag + Lang("，发生错误：" + err, ""), 1));
        });
    };
    //点击确定按钮，完成配置域名和私钥的配置
    window.configStepClick = function () {
        var id = ++UserClickSyncID;
        var tag = "Step-2", sEl = ".configStepState";

        $(".step2Hide").hide();
        $(".step2Show").show();
        ShowState(sEl, false);

        var domains = $(".in_domains").val().trim();
        var domainsStore = $(".choice_domains_store").prop("checked");
        var privateKey = $(".in_privateKey").val().trim();
        var accountKey = $(".in_accountKey").val().trim();
        var email = $(".in_email").val().trim();
        var emailStore = $(".choice_email_store").prop("checked");
        var eabKid = $(".in_eab_kid").val().trim();
        var eabKey = $(".in_eab_key").val().trim();
        var termsAgree = $(".choice_termsAgree").prop("checked");

        //域名转成数组
        domains = domains.replace(/\s+/g, ",").replace(/，+/g, ",").split(/,+/);
        for (var i = 0, mp = {}; i < domains.length; i++) {
            var domain = domains[i];
            if (!domain) {
                domains.splice(i, 1); i--; continue;
            } else if (mp[domain])
                return ShowState(sEl, Lang("域名" + domain + "重复！", ""), 1);
            if (/[:\/;]/.test(domain))//简单校验域名格式
                return ShowState(sEl, Lang("域名" + domain + "格式错误！", ""), 1);
            mp[domain] = 1;
        }
        localStorage[InputDomainsStoreKey] = domainsStore ? domains.join(", ") : "";
        localStorage[InputEmailStoreKey] = emailStore ? email : "";

        //校验是否输入
        if (!domains.length)
            return ShowState(sEl, Lang("ERROR 域名是必须项。", " "), 1);
        if (!accountKey)
            return ShowState(sEl, Lang("ERROR 需要创建或输入 ACME 账户的私钥。", " "), 1);
        if (!privateKey)
            return ShowState(sEl, Lang("ERROR 需要证书的私钥。", " "), 1);
        if (!/.+@.+\..+/.test(email) || /[\s,;]/.test(email))
            return ShowState(sEl, Lang("ERROR 需要填写电子邮箱地址。", " "), 1);
        if (ACME.StepData.needEAB && !(eabKid && eabKey))
            return ShowState(sEl, Lang("EAB KID and HMAC KEY not found.", " "), 1);
        if (ACME.StepData.termsURL && !termsAgree)
            return ShowState(sEl, Lang("ERROR 需要同意使用条款。", " "), 1);

        //校验私钥格式是否支持
        var privateKeyInfo, parsePrivateKey = function () {
            X509.KeyParse(privateKey, function (info) {
                privateKeyInfo = info; parseAccountKey();
            }, function (err) {
                ShowState(sEl, Lang("ERROR 证书私钥无效", ""), 1);
            }, 1);
        };
        var accountKeyInfo, parseAccountKey = function () {
            X509.KeyParse(accountKey, function (info) {
                accountKeyInfo = info; parseKeyOK();
            }, function (err) {
                ShowState(sEl, Lang("ERROR 账户私钥无效，无法工作，请前往<a href='/settings/'>设置</a>页面清空数据", ""), 1);
            }, 1);
        };

        var msg0 = CLog(tag, 0, ShowState(sEl, PleaseWaitTips(), 2));
        //设置配置数据
        var parseKeyOK = function () {
            if (UserClickSyncKill(id, tag, msg0)) return;

            ACME.StepData.config = {
                domains: domains
                , privateKey: privateKeyInfo
                , accountKey: accountKeyInfo
                , email: email
                , eabKid: eabKid
                , eabKey: eabKey
            };
            CLog(tag, 0, "config", ACME.StepData.config);

            acmeNewAccount();
        };

        //ACME账户接口调用
        var acmeNewAccount = function () {
            var msg0 = CLog(tag, 0, ShowState(sEl, PleaseWaitTips() + Lang("调用 ACME 服务 newAccount 接口：", " ") + ACME.DirData.newAccount, 2));
            ACME.StepAccount(function () {
                if (UserClickSyncKill(id, tag, msg0)) return;
                acmeNewOrder();
            }, function (err) {
                if (UserClickSyncKill(id, tag, msg0 + " err: " + err)) return;
                CLog(tag, 1, ShowState(sEl, Lang("调用 ACME 服务的 newAccount 接口：", " ")
                    + ACME.DirData.newAccount + Lang("，发生错误：" + err, ""), 1));
            });
        };
        //ACME订单创建接口调用
        var acmeNewOrder = function () {
            var msg0, onProgress = function (tips) {
                if (id != UserClickSyncID) return;
                msg0 = CLog(tag, 0, ShowState(sEl, PleaseWaitTips() + Lang("调用 ACME 服务订单接口。", " ") + ' ' + tips + " URL:" + ACME.DirData.newOrder, 2));
            }; onProgress("");
            ACME.StepOrder(onProgress, function () {
                if (UserClickSyncKill(id, tag, msg0)) return;
                acmeOK();
            }, function (err) {
                if (UserClickSyncKill(id, tag, msg0 + " err: " + err)) return;
                CLog(tag, 1, ShowState(sEl, Lang("调用 ACME 服务订单接口：", "")
                    + ACME.DirData.newOrder + Lang("，发生错误：" + err, ""), 1));
            });
        };
        //ACME接口调用完成，显示下一步
        var acmeOK = function () {
            verifyStepShow();

            CLog(tag, 0, ShowState(sEl, Lang(
                "配置完成，"
                , "")
                + NextStepTips(), 2), ACME.StepData);
        };

        parsePrivateKey();
    };






    /************** UI Step3: Verify Domain Ownership **************/
    //显示第三步界面
    var verifyStepShow = function () {
        document.getElementById('q-steps2').style.display = 'none';
        document.getElementById('q-steps3').style.display = '';
        $(".step3Hide").hide();
        $(".step3Show").show();
        $(".verifyStepBtn").show();
        $(".verifyRunStopBtn").hide();
        $(".finalizeOrderBtn").hide();
        ShowState(".verifyStepState", false);

        //显示所有域名的验证界面
        verifyBoxShow();
    };
    //停止验证
    window.verifyRunStopClick = function () {
        var id = ++UserClickSyncID;
        $(".verifyStepBtn").show();
        $(".verifyRunStopBtn").hide();
        $(".finalizeOrderBtn").hide();
        ShowState(".verifyStepState", false);
        verifyRunStopFn && verifyRunStopFn();
    };
    var verifyRunStopFn;
    //点击开始验证按钮，验证所有域名所有权
    window.verifyStepClick = function () {
        var id = ++UserClickSyncID;
        var tag = "Step-3", sEl = ".verifyStepState";

        $(".step3Hide").hide();
        $(".step3Show").show();
        $(".verifyStepBtn").hide();
        $(".verifyRunStopBtn").show();
        $(".finalizeOrderBtn").hide();
        ShowState(sEl, false);

        var domains = ACME.StepData.config.domains, auths = ACME.StepData.auths;
        //验证中更新状态显示
        var updateState = function (init, stopNow, isFail) {
            var isStop = stopNow || id != UserClickSyncID;
            var okCount = 0, errCount = 0, execCount = 0;
            for (var i0 = 0; i0 < domains.length; i0++) {
                var domain = domains[i0], auth = auths[domain], challs = auth.challenges;
                var stateEl = $(".verifyItemState_" + i0);
                //authState: 0 待验证，1验证中，2等待重试authTryCount，11验证成功，12验证失败authError
                if (auth.authState == 11) {//验证成功的，初始化也不要修改验证方式了
                    ShowState(stateEl, ACME.ChallName(challs[auth.challIdx]) + " OK!", 2, "");
                    okCount++;
                    continue;
                }
                if (init) { //记住选中的验证类型
                    var choiceEl = $("input[name=choice_authItem_" + i0 + "]");
                    for (var i = 0; i < choiceEl.length; i++) {
                        var el = choiceEl[i];
                        if (!el.checked) { //未选中的隐藏掉
                            $(el.parentNode).hide();
                        } else {
                            auth.challIdx = +$(el).attr("challidx");
                        }
                    }
                    auth.authState = 0;
                    auth.authTryCount = 0;
                    auth.authError = "";
                    auth.authTimer = 0;
                }
                var challName = ACME.ChallName(challs[auth.challIdx]);
                if (auth.authState == 12) {//验证失败
                    ShowState(stateEl, challName + Lang("，验证失败：", "")
                        + auth.authError, 1, "");
                    errCount++;
                    continue;
                }
                execCount++;
                if (isStop) {
                    ShowState(stateEl, false);
                    clearTimeout(auth.authTimer); auth.authTimer = 0;
                } else if (auth.authState == 2)
                    ShowState(stateEl, Lang("等待重试中...", "")
                        + " " + auth.authTryCount + " " + auth.authError, 3, "");
                else if (auth.authState == 1)
                    ShowState(stateEl, Lang("验证中...", ""), 0, "");
                else ShowState(stateEl, Lang("等待验证...", ""), 0, "");
            }
            if (!isStop || stopNow) {
                var goto2 = Lang("请重试", " ");
                var msg = ShowState(sEl, (isFail ? Lang("验证失败，", "") + goto2 :
                    isStop ? Lang("已取消，", "Canceled, ") + goto2 :
                        Lang("正在验证，请耐心等待... ", ""))
                    + "<div>"
                    + Lang("验证通过：", "") + okCount + ", "
                    + Lang("未通过：", "") + errCount + ", "
                    + Lang("验证中：", "") + execCount
                    + "</div>"
                    , isStop ? 1 : 0);
                if (isStop) {
                    CLog(tag, 1, msg);
                }
            }
        }
        updateState(1);
        //取一个进行验证
        var run = function () {
            if (id != UserClickSyncID) return;
            updateState();
            var authItem, hasRunning = 0, okCount = 0, errCount = 0;
            for (var i0 = 0; i0 < domains.length; i0++) {
                var domain = domains[i0], auth = auths[domain];
                if (!authItem && !auth.authState) authItem = auth;
                if (auth.authState == 1) hasRunning++;
                if (auth.authState == 11) okCount++;
                if (auth.authState == 12) errCount++;
            }
            if (okCount == domains.length)//全部验证成功
                return verifyOK();
            if (okCount + errCount == domains.length)//全部验证完成，存在不通过的
                return verifyFail();
            if (!authItem || hasRunning) return;//没有待验证的或已有验证中，继续等待

            authItem.authState = 1;
            authItem.authTryCount++;
            authItem.authError = "";
            updateState();
            ACME.StepVerifyAuthItem(authItem, authItem.challIdx, function (isOk, retryTime, err) {
                if (id != UserClickSyncID) return;
                if (isOk) {
                    authItem.authState = 11;
                } else {
                    authItem.authState = 2;
                    authItem.authError = err;
                    authItem.authTimer = setTimeout(function () {
                        authItem.authState = 0;
                        authItem.authTimer = 0;
                        run();
                    }, retryTime);
                }
                run();
            }, function (err) {
                if (id != UserClickSyncID) return;
                authItem.authState = 12;
                authItem.authError = err;
                run();
            });
        };

        CLog(tag, 0, "==========Verify Start==========");
        var verifyEnd = function () {
            $(".verifyRunStopBtn").hide();
            verifyRunStopFn = null;
            CLog(tag, 0, "==========Verify End==========");
        };
        //中途停止控制
        verifyRunStopFn = function () {
            verifyEnd();
            updateState(0, 1);
        };
        //验证完成，存在不通过的
        var verifyFail = function () {
            CLog(tag, 1, "Verify Fail!");
            updateState(0, 1, 1);
            verifyEnd();
        };
        //全部验证成功
        var verifyOK = function () {
            CLog(tag, 0, "Verify OK!");
            verifyEnd();

            finalizeOrderClick();
        };

        //调用完成订单接口，生成证书
        window.finalizeOrderClick = function () {
            $(".finalizeOrderBtn").hide();
            var msg0, onProgress = function (tips) {
                if (id != UserClickSyncID) return;
                msg0 = CLog(tag, 0, ShowState(sEl, PleaseWaitTips()
                    + Lang("验证已通过，正在签发证书。", "")
                    + ' ' + tips, 2));
            }; onProgress("");
            ACME.StepFinalizeOrder(onProgress, function () {
                if (UserClickSyncKill(id, tag, msg0)) return;
                //显示下一步
                downloadStepShow();

                CLog(tag, 0, ShowState(sEl, Lang(
                    "验证已通过，证书已签发，"
                    , "")
                    + NextStepTips(), 2), ACME.StepData);
            }, function (err) {
                if (UserClickSyncKill(id, tag, msg0 + " err: " + err)) return;
                $(".finalizeOrderBtn").show();
                CLog(tag, 1, ShowState(sEl, Lang("签发证书发生错误，", "") + TryAgainTips()
                    + Lang("如果多次重试都无法签发证书，请直接刷新页面重新开始。", "")
                    + " Error: " + err, 1));
            });
        };

        run();
    };







    /************** UI Step4: Download and save the certificate PEM file **************/
    //显示第四步界面
    var downloadStepShow = function () {
        document.getElementById('q-steps2').style.display = 'none';
        document.getElementById('q-steps3').style.display = 'none';
        document.getElementById('q-steps4').style.display = '';
        $(".step4Hide").hide();
        $(".step4Show").show();
        ShowState(".downloadStepState", false);
        var config = ACME.StepData.config;
        var hasPEM = ACME.StepData.order.downloadPEM;
        var pemTxt = hasPEM || Lang("未发现证书，请刷新页面重新开始。", "", true);



        // Qiu: 保存用于证书管理
        let nowTime = new Date().toISOString();
        let q_manageData = {
            cert: pemTxt,
            key: config.privateKey.pem,
            time: nowTime,
            domains: config.domains,
        };
        let q_manageDataOut = JSON.parse(localStorage.getItem('q-manageDataPairs')) || [];
        q_manageDataOut.push(q_manageData);
        localStorage.setItem('q-manageDataPairs', JSON.stringify(q_manageDataOut));



        $(".txt_downloadCert").val(pemTxt);
        $(".txt_downloadKey").val(config.privateKey.pem);

        downFileName = config.domains[0].replace(/^\*\./g, "").replace(/[^\w]/g, "_");
        downloadFileNameShow(downFileName);

        var logTxts = [];
        var SP = function (tag) {
            logTxts.push("\n=========== " + tag + " ===========");
            return logTxts
        }
        var logSet = Object.assign({
            acmeURL: ACME.URL
            , accountURL: ACME.StepData.account.url
            , X509: {
                DefaultType2_RSA: X509.DefaultType2_RSA
                , DefaultType2_ECC: X509.DefaultType2_ECC
            }
            , Window: {
                DefaultDownloadFileNames: DefaultDownloadFileNames
            }
        }, config);
        logSet.privateKey = config.privateKey.pem;
        logSet.accountKey = config.accountKey.pem;

        var logTitle = '/********** ' + Lang($(".clientNameCN").html(), $(".clientNameEN").html(), true) + ' *********/';
        logTxts.push(logTitle);
        logTxts.push(Lang("在线网址（GitHub）：", "", true) + 'https://xiangyuecn.github.io/ACME-HTML-Web-Browser-Client/ACME-HTML-Web-Browser-Client.html');
        logTxts.push(Lang("在线网址（Gitee）：", "", true) + 'https://xiangyuecn.gitee.io/acme-html-web-browser-client/ACME-HTML-Web-Browser-Client.html');
        logTxts.push("");
        logTxts.push('GitHub: https://github.com/xiangyuecn/ACME-HTML-Web-Browser-Client');
        logTxts.push('Gitee: https://gitee.com/xiangyuecn/ACME-HTML-Web-Browser-Client');
        logTxts.push("");
        logTxts.push(Lang("提示：你可以将本文件拖拽进客户端网页内，将自动填充本次证书申请的所有配置参数。", "", true));
        logTxts.push("");
        SP(Lang("证书申请时间", "", true))
            .push(new Date().toLocaleString());
        SP(Lang("域名列表", "", true))
            .push(config.domains.join(", "));
        SP(Lang("ACME服务地址", "", true))
            .push(ACME.URL);
        SP(Lang("CSR文本", "", true))
            .push(ACME.StepData.order.orderCSR);
        SP(Lang("证书PEM文本", "", true))
            .push(pemTxt);
        SP(Lang("证书私钥PEM文本", "", true))
            .push(config.privateKey.pem);
        SP(Lang("账户私钥PEM文本", "", true))
            .push(config.accountKey.pem);
        SP(Lang("账户URL", "", true))
            .push(ACME.StepData.account.url);
        SP(Lang("完整配置信息", "", true))
            .push("<ACME-HTML-Web-Browser-Client>" + JSON.stringify(logSet) + "</ACME-HTML-Web-Browser-Client>");
        logTxts.push(""); logTxts.push(logTitle); logTxts.push("");

        $(".txt_downloadLog").val(hasPEM ? logTxts.join("\n") : pemTxt);
    };
    var initStep4 = function () {//页面启动时初始化，绑定配置文件拖拽事件
        $("body").bind("dragover", function (e) {
            e.preventDefault();
        }).bind("drop", function (e) {
            e.preventDefault();

            var file = e.dataTransfer.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function (e) {
                var txt = reader.result;
                var m = /ACME-HTML-Web-Browser-Client>(.+?)<\/ACME-HTML-Web-Browser-Client/.exec(txt);
                if (!m) return Toast(Lang("拖入的文件中未发现配置信息，请拖上次申请证书时保存的记录LOG文件！", ""), 1);

                DropConfigFile = JSON.parse(m[1]);
                for (var k in DropConfigFile.X509) X509[k] = DropConfigFile.X509[k];
                for (var k in DropConfigFile.Window) window[k] = DropConfigFile.Window[k];

                CLog("DropConfigFile", 0, "Reset Config", DropConfigFile);
                Toast(Lang("识别到拖入的记录LOG文件，已填充上次申请证书时使用的配置。", ""), 2);
                resetStep1();//重新初始化第1步
                downloadFileNameShow();
            }
            reader.readAsText(file);
        });
    };
    var downFileName = "";
    window.DefaultDownloadFileNames = { //允许设置默认的文件名，下载时自动使用此文件名
        Cert: "" /*domain.crt*/, Key: "" /*domain.key*/, Log: "" /*domain.log*/
    };
    window.downloadBtnClick = function (type) {
        var val = $(".txt_download" + type).val();
        var fileName = downFileName;
        if (type == "Cert") fileName += ".pem";
        if (type == "Key") fileName += ".key";
        if (type == "Log") fileName += ".log";
        fileName = DefaultDownloadFileNames[type] || fileName;

        var url = URL.createObjectURL(new Blob([val], { "type": "text/plain" }));
        var downA = document.createElement("A");
        downA.href = url;
        downA.download = "ZSEncrypt_" + fileName;
        downA.click();
    };
    window.downloadFileNameShow = function (name) {//显示下载文件名称，优先使用手动设置的默认名称
        name = name || "your_domain";
        var name2 = (DefaultDownloadFileNames.Cert || "").replace(/\.[^\.]+$/g, "");
        $(".downloadFileName").html(name2 || name);
        $(".downloadKeyFileName").html(DefaultDownloadFileNames.Key || name + ".key");
        $(".downloadCertFileName").html(DefaultDownloadFileNames.Cert || name + ".pem");
    };













    //Test_打头的方法仅供测试用：完成第二步后允许进行UI调试，手动调用Test_AllStepData_Save()，刷新页面可恢复界面
    window.Test_AllStepData_Save = function () {
        if (!ACME.StepData.order) throw new Error(Lang("未完成第二步操作", "", true));

        var config = ACME.StepData.config;
        delete ACME.PrevNonce;
        config.privateKey = config.privateKey.pem;
        config.accountKey = config.accountKey.pem;

        localStorage[Test_AllStepData_StoreKey] = JSON.stringify(ACME);
        ACME = null;
        console.warn(Lang("仅供测试：已保存测试数据，需刷新页面", "", true));
    };
    var Test_AllStepData_StoreKey = "ACME_HTML_Test_AllStepData";
    var initTest_Restore = function () {
        if (localStorage[Test_AllStepData_StoreKey]) {
            console.warn(Lang("仅供测试：已保存测试数据，调用Test_Restore_StepXXX()进行恢复步骤界面", "", true));
        }
    }
    var Test_AllStepData_Restore = function (next) {
        var data = JSON.parse(localStorage[Test_AllStepData_StoreKey] || "{}");
        if (!data.StepData) throw new Error(Lang("未保存数据", "", true));
        for (var k in data) ACME[k] = data[k];

        var config = ACME.StepData.config;
        X509.KeyParse(config.privateKey, function (info) {
            config.privateKey = info;
            X509.KeyParse(config.accountKey, function (info) {
                config.accountKey = info;
                console.log("ACME.StepData", ACME.StepData);
                setTimeout(function () { next() });
            });
        });
    };
    window.Test_Restore_StepAuth = function () {
        Test_AllStepData_Restore(function () {
            console.warn(Lang("仅供测试：已手动恢复步骤三界面", "", true));
            verifyStepShow();
        });
    };
    window.Test_Restore_StepDownload = function () {
        Test_AllStepData_Restore(function () {
            console.warn(Lang("仅供测试：已手动恢复步骤四界面", "", true));
            downloadStepShow();
        });
    };
})();