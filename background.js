(function() {

  console.log('Started background.js');

  chrome.browserAction.onClicked.addListener(function(the_tab){
    chrome.tabs.insertCSS({file: "extract.css"});
    chrome.tabs.executeScript({file: "jquery-2.1.3.js"});
    chrome.tabs.executeScript({file: "content_script.js"});
  });

})()
