//=================================================
//================= UI functions ==================
//=================================================
//LICENSE: GPL-3.0, https://github.com/xiangyuecn/ACME-HTML-Web-Browser-Client

// ===========================================
// ===== Modified by: Qiu (zeoseven.com) =====
// ===========================================

var acmeReadDirGotoCORSInit = function () {
    if (!window.IsReadDirGotoCORS) return;
    var stateEl = $(".acmeReadDirGotoCORSState").show().html(`
<div style="color:#cb1d1d">
<span class="langCN">本客户端正在以跨域兼容模式运行，请按正常流程操作即可，目标ACME服务URL=${window.Default_ACME_URL}</span>
<span class="langEN">This client is running in cross-domain compatibility mode, please follow the normal process, the target ACME service URL=${window.Default_ACME_URL}</span>
</div>
`);
    LangReview(stateEl);
};
var acmeReadDirGotoCORS = function (title) {
    "use strict";
    var codes = "// " + Lang("请复制本代码到打开的ACME服务URL页面的浏览器控制台中运行。", "Please copy this code to the browser console of the opened ACME service URL page to run.", true)
        + "\n\nvar Default_ACME_URL=" + JSON.stringify(ACME.URL) + ";"
        + "\nvar IsReadDirGotoCORS=true;"
        + "\nvar PageRawHTML=`"
        + PageRawHTML.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "$\\{")
        + "`;";
    codes += "\n(" + (function () {
        console.clear();
        document.head.innerHTML = /<head[^>]*>([\S\s]+?)<\/head>/i.exec(PageRawHTML)[1];
        document.body.innerHTML = /<body[^>]*>([\S\s]+)<\/body>/i.exec(PageRawHTML)[1];
        var js = /<script[^>]*>([\S\s]+?)<\/script>/ig, m;
        while (m = js.exec(PageRawHTML)) eval.call(window, m[1]);
    }).toString() + ")()";
    $(".gotoCORSBox").hide();
    var stateEl = $(".acmeReadDirState").append(`
<div class="gotoCORSBox" style="padding-top:15px">
<div class="pd Bold" style="color:red">
<i class="must">*</i>
`+ (title || `
<span class="langCN">由于此ACME服务对跨域访问支持不良，</span>
<span class="langEN">Because this ACME service has poor support for cross-domain access, </span>
<span style="font-size:24px">
<span class="langCN">请按下面步骤操作：</span>
<span class="langEN">please follow the steps below:</span>
</span>`) + `
</div>
<div style="padding-left:40px">
<div class="pd">
<span class="langCN">1. 请在浏览器中直接打开此ACME服务URL，<a href="${ACME.URL}" target="_blank">点此打开</a>；</span>
<span class="langEN">1. Please open the ACME service URL directly in the browser, <a href="${ACME.URL}" target="_blank">click here to open</a>;</span>
</div>
<div class="pd">
<span class="langCN">2. 在上一步打开的页面中打开浏览器控制台（需等页面加载完成后，再按F12键）；</span>
<span class="langEN">2. Open the browser console in the page opened in the previous step (after the page is loaded, press the F12 key);</span>
</div>
<div class="pd">
<span class="langCN">3. 复制以下代码，在第2步打开的浏览器控制台中运行，然后就可以正常申请证书了。</span>
<span class="langEN">3. Copy the following code, run it in the browser console opened in step 2, and then you can apply for the certificate normally.</span>
</div>
<div class="pd" style="font-size:13px;color:#aaa">
<span class="langCN">工作原理：代码内包含了本页面源码，在目标页面内运行后将原样的显示出本客户端，然后按正常流程操作即可，此时已没有跨域问题了（既然打不过，那就加入他们）。</span>
<span class="langEN">Working principle: The code contains the source code of this page. After running in the target page, the client will be displayed as it is, and then operate according to the normal process. At this time, there is no cross-domain problem (if we can't beat them, we'd better join them).</span>
</div>
</div>
<div style="padding-top:20px">
<textarea class="gotoCORSText" style="width:100%;height:200px" readonly></textarea>
</div>
</div>
`);
    $(".gotoCORSText").val(codes);
    LangReview(stateEl);
};