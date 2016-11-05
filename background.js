(function() {

  console.log('Started background.js');

  var injectCss = function() {
    return [
      // 'var cssfonts = document.createElement("link");',
      // 'cssfonts.setAttribute("rel", "stylesheet");',
      // 'cssfonts.setAttribute("type", "text/css");',
      // 'cssfonts.setAttribute("href", chrome.extension.getURL("extract.css"));',
      // 'document.getElementsByTagName("head")[0].appendChild(cssfonts);',
      'var cssfonts = document.createElement("link");',
      'cssfonts.setAttribute("rel", "stylesheet");',
      'cssfonts.setAttribute("type", "text/css");',
      'cssfonts.setAttribute("href", "https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/css/bootstrap.min.css");',
      'document.getElementsByTagName("head")[0].appendChild(cssfonts);',
    ].join('\n');
  };

  var injectJs = function() {
    return [
      'var jsscript = document.createElement("script");',
      'jsscript.setAttribute("type", "text/javascript");',
      'jsscript.setAttribute("src", chrome.extension.getURL("jquery-2.1.3.js"));',
      'document.getElementsByTagName("head")[0].appendChild(jsscript);'
    ].join('\n')
  };


  chrome.browserAction.onClicked.addListener(function(the_tab){
    // console.log('clicked1');
    // chrome.tabs.executeScript(the_tab.id,
    //                           {code: "console.log('clicked');"});
    // chrome.tabs.executeScript({code: injectJs() });
    chrome.tabs.insertCSS({file: "extract.css"});
    // chrome.tabs.executeScript({code: injectCss()});
    chrome.tabs.executeScript({file: "jquery-2.1.3.js"});
    chrome.tabs.executeScript({
      file: "content_script.js"
    });
  });


})()
