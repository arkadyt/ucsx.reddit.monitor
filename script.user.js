/** 
    The MIT License (MIT)

    Copyright © 2020, Andrew Titenko

    Permission is hereby granted, free of charge, to any person obtaining a copy of
    this software and associated documentation files (the "Software"), to deal in
    the Software without restriction, including without limitation the rights to
    use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
    the Software, and to permit persons to whom the Software is furnished to do so,
    subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
    FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
    COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
    IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
    CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

// ==UserScript==
// @name            [UCSX Reddit Monitor] Graph Followers Activity Of A Subreddit
// @description     Ever wanted to know the best time to post in certain /r/subreddit? This little script is all you need, my fellow redditor! This userscript cyclically records online user count of a subreddit in a CSV file. It then can be exported and used in a spreadsheet or directly viewed as a graph on PLOT.LY. Visit script homepage for more info!
// @copyright       2020, Andrew Titenko
// @license         MIT; https://opensource.org/licenses/MIT
// @namespace       arkadyt-ucsx-reddit-monitor
// @author          arkadyt
// @homepageURL     https://github.com/arkadyt/_UCSX_Reddit_Monitor_
// @supportURL      https://github.com/arkadyt/_UCSX_Reddit_Monitor_#table-of-contents
// @contributionURL https://paypal.me/arcan770077f
// @updateURL       https://raw.githubusercontent.com/arkadyt/_UCSX_Reddit_Monitor_/master/script.js
// @version         1.2.0
// @include         *reddit.com/r/*
// @require         https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// @require         https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js
// @grant           GM.xmlHttpRequest
// ==/UserScript==

/* Changelog
 * v1.2.0
 *   - Now compatible with new Reddit design.
 *   - Added support for some old browsers.
 * v1.1.2
 *   - @supportURL now points at 'Table of contents' section instead of repository issues.
 *   - Added this changelog.
 *
 * v1.1.1
 *   - Fixed wrong GitHub username in URLs.
 *   - Updated README.md.
 *
 * v1.1.0
 *   - UI now resides in its own floating panel.
 *   - Graphs can now be viewed on Plot.ly with one click.
 *   - Added comprehensive status output.
 *   - Capture frequency can now be changed.
 *   - Script now has to be started manually.
 *   - Added page leave confirmation prompt.
 *   - CSV date values now include month and date.
 *   - Various code optimizations.
 *
 *   Bugfixes
 *   - Fixed incorrect entry count display.
 *   - Fixed #1. Need to double click 'EXPORT CSV' link to export file.
 *   - Fixed #2. Link underlining is absent at control panel.
 *   - Fixed #3 & #6. Page refresh resets the script & Page refresh causes frequency counter reset.
 *   - Fixed #4. Second counter falls into negative values when rapidly changing scan frequency.
 *   - Fixed #5. XMLHttp requests start getting cached after a period of inactivity.
 *
 * v1.0.0
 *   - Added GUI, 'Export CSV' and 'Restart' buttons in the top subreddit panel.
 *   - Added CSV export functionality.
 *   - Improved restarting routine.
 *   - Took off storage limits.
 *   - Added display of current amount of collected entries.
 *
 *   Known bugs:
 *   - Have to double click the 'Export CSV' button to see download prompt.
 *
 * v0.1
 *   - Scans subreddit pages
 *   - Logs unformatted captured data in console
 *
 *   Limitations:
 *   - No GUI
 *   - Limited in available storage (4093 bytes)
 *   - Quickly eats up RAM due to frequent page refreshing
 * */

var idLinkExport = "ucsx-reddit-monitor-link-csv-export";
var idLinkRestart = "ucsx-reddit-monitor-link-restart";
var idLinkPlotly = "ucsx-reddit-monitor-link-plotly";
var idLinkCaptureDelayDecrease = "ucsx-reddit-monitor-link-frequency-decrease";
var idLinkCaptureDelayIncrease = "ucsx-reddit-monitor-link-frequency-increase";
var idSpanCaptureDelay = "ucsx-reddit-monitor-span-capture-frequency";
var idSpanSecondsToNextQuery = "ucsx-reddit-monitor-span-seconds-to-next-query";
var idSpanEntriesCollected = "ucsx-reddit-monitor-span-entries-collected";
var idSpanStartDate = "ucsx-reddit-monitor-span-start-date";
var idSpanTimeRunning = "ucsx-reddit-monitor-span-time-running";

var homepageURL = "https://github.com/arkadyt/_UCSX_Reddit_Monitor_";

// Reddit native css class applied to online users counter (as of March, 2018).
var oldReddit_counterClass = "users-online";

// New reddit design changed things.
// Real id now consists of multiple keywords conc. with '---'.
// Following one is a permanent member. Detected with regex.
var newReddit_counterId = 'CurrentlyViewing';

var captureDelay = 5; // minutes
var secondsAfterLastQuery = 0;
var graphData = [[], []]; // time, amount

var hasStarted = false;
var timeScannerStarted = Date.now();

var exportFileName = `ucsx-reddit-monitor-output-${document.location.href.match(/\/r\/(.+?)\//)}-${timeScannerStarted}.csv`;


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function pad(n, z) {
  z = z || 2;
  return ('00' + n).slice(-z);
}  

function getTimeRunning() {
  var i = Date.now() - timeScannerStarted;

  var ms = i % 1000;
  i = (i - ms) / 1000;
  var secs = i % 60;
  i = (i - secs) / 60;
  var mins = i % 60;
  i = (i - mins) / 60;
  var hrs = i % 24;
  i = (i - hrs) / 24;
  var days = i;

  return [ms, secs, mins, hrs, days];
}

function updateGui() {
  if (arguments.length === 0) {
    updateGui(idSpanCaptureDelay);
    updateGui(idSpanSecondsToNextQuery);
    updateGui(idSpanEntriesCollected);
    updateGui(idSpanStartDate);
    updateGui(idSpanTimeRunning);
    return;
  }

  for (var i = 0; i < arguments.length; i++) {
    switch (arguments[i]) {
      case idSpanCaptureDelay:
        document.getElementById(arguments[i]).innerHTML = captureDelay;
        break;
      case idSpanSecondsToNextQuery:
        var newSecondsValue = captureDelay * 60 - secondsAfterLastQuery;
        document.getElementById(arguments[i]).innerHTML =
          newSecondsValue <= 0 ? `Sending query...` : `${newSecondsValue} second(s) till next query.`;
        break;
      case idSpanEntriesCollected:
        document.getElementById(arguments[i]).innerHTML = graphData[0].length;
        break;
      case idSpanStartDate:
        document.getElementById(arguments[i]).innerHTML = new Date(timeScannerStarted).toString();
        break;
      case idSpanTimeRunning:
        var arr = getTimeRunning();
        document.getElementById(arguments[i]).innerHTML = `${arr[4]} day(s), ${pad(arr[3])}:${pad(arr[2])}:${pad(arr[1])}s.`;
        break;
    }
  }
}

function saveEntry(number) {
  var date = new Date();
  var timestamp = (date.getMonth() + 1) + '/' + date.getDate() + ', ' + date.toLocaleTimeString().replace(/:\d+\s/, ' '); // kicking seconds
  
  graphData[0].push(timestamp);
  graphData[1].push(number);
}

function changeCaptDelay(number) {
  if (number >= 1) {
    captureDelay = number;
    updateGui(idSpanCaptureDelay);
  } else {
    console.error("Invalid input: frequency can't be lower than 1.");
  }
}

function resetScript() {
  if(!hasStarted) {
    /* Start button code. */
    timeScannerStarted = Date.now();
    document.getElementById(idLinkRestart).innerHTML = 'RESET SCRIPT';
    _main(); // toggles hasStarted
    return;
  }
  
  /* Restart button code. */
  graphData = [[], []];
  timeScannerStarted = Date.now();
  secondsAfterLastQuery = 0;
  updateGui();
}

function exportCsv() {
  var a = document.createElement("a");
  
  var data = '';
  for(var i = 0; i < graphData[0].length; i++) {
    data += `"${graphData[0][i]}","${graphData[1][i]}"`;
    
    // unless its a last pair of values
    if(i < graphData[0].length -1) {
      data += '\n';
    }
  }
  
  a.setAttribute(
    "href", `data:application/csv;charset=utf-8,${encodeURIComponent(data)}`);
  a.setAttribute("download", exportFileName);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function exportToPlotly() {
  function getPlotlyGridData(){
    var sub = document.location.href.match(/\/r\/(.+?)\//)[0];
    
    return {'data': [{'line': {'color': 'green'},
      'mode': 'lines',
      'name': sub,
      'type': 'line',
      'x': graphData[0],
      'y': graphData[1]}],
    'layout': {'title': sub,
    'xaxis': {'title': 'Time'},
    'yaxis': {'title': 'Users online'}}}; 
  }  
  
  var hiddenform = $('<div id="hiddenform" '+
      'style="display:none;">'+
      '<form action="https://plot.ly/datagrid" '+
      'method="post" target="_blank">'+
      '<input type="text" '+
      'name="data" /></form></div>')
      .appendTo(document.body);
  hiddenform.find('input').val(
      JSON.stringify(getPlotlyGridData()));
  hiddenform.find('form').submit();
  hiddenform.remove();
}

function sendQuery() {
  GM.xmlHttpRequest({
    method: "GET",
    url: `${window.location.href}?nocache=${Date.now()}`,
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "text/xml",
      "Cache-Control": "max-age=0,no-cache"
    },
    onload: function(response) {
      if (response.readyState == 4 && response.status == 200) {
        // Extract online users count.
        var dom = $($.parseHTML(response.responseText));
        var number = dom.find('.' + oldReddit_counterClass).children().html();

        if(number) {
            number.replace(/\D/g, '');
        } else {
          // Dealing with new reddit design.
          number = $(`p[id*='${newReddit_counterId}']`).prev().html();
          if (number.indexOf('k') > -1) {
            if (number.indexOf('.') > -1) {
              number = number.replace('k', '00')
            }
            number = parseFloat(number) * 1000;
          }
        }

        saveEntry(number);
        updateGui(idSpanEntriesCollected);
      }
    },
  });
}

function init() {
  insertCustomHTML();
  
  $(`#${idLinkRestart}`).click(resetScript);
  $(`#${idLinkExport}`).click(exportCsv);
  $(`#${idLinkPlotly}`).click(exportToPlotly);
  $(`#${idLinkCaptureDelayDecrease}`).click(function() { changeCaptDelay(captureDelay - 1); });
  $(`#${idLinkCaptureDelayIncrease}`).click(function() { changeCaptDelay(captureDelay + 1); });

  // Confirm page leave
  window.onbeforeunload = function(e) {
    if(hasStarted) {
      e.returnValue = true;
      return 'Are you sure? You will lose your data!';
    }
  };

  // 'Start script' button flickering 
  (async function () {
    while(!hasStarted) {
      document.getElementById(idLinkRestart).setAttribute('style', 'color: #fff');
      await sleep(1000);
      document.getElementById(idLinkRestart).setAttribute('style', '');
      await sleep(1000);
    }
  })();    
}

async function _main() {
  hasStarted = true; 
  
  updateGui();

  while (hasStarted) {
    updateGui(idSpanSecondsToNextQuery, idSpanTimeRunning);

    if (secondsAfterLastQuery % (captureDelay * 60) === 0 ||
      secondsAfterLastQuery > captureDelay * 60) { //#4
      sendQuery();
      secondsAfterLastQuery = 0;
    }

    secondsAfterLastQuery++;
    await sleep(1000);
  }
}

init();





/* Markup & styling stuff. */

//#2
function addCss(cssString) {
  var head = document.getElementsByTagName('head')[0];
  var newCss = document.createElement('style');
  newCss.type = "text/css";
  newCss.innerHTML = cssString;
  head.appendChild(newCss);
}
  
function insertCustomHTML() {
  addCss (`
    a.ucsx { 
      text-decoration: underline;  
      color: #910000;
    }
    
    a.ucsxhover:hover { 
      color: #fff; 
    }
    
    a.ucsxbold { 
      font-size:12px; 
      font-weight:bold; 
    }
    
    div.ucsx { 
      background:#d5c2aa; 
      padding:10px; 
      padding-bottom:4px; 
      padding-top:0px; 
      font-family:monospace;
    }
    
    .ucsxwrapr { 
      position: fixed; 
      display: inline-block; 
      bottom: 40px; 
      left: 5px; 
      z-index: 9998;
      border: 4px solid #e7d8c6; 
      border-bottom-color: #896b43; 
      border-left-color: #896b43; 
      background: #d5c2aa; 
      color:#555;
      font-size: 14px;
    }
  `);
      
  var welcomePanel = `
    <div class="ucsx" style="padding-top:4px;">
      <span>Welcome to the UCSX Reddit Monitor! Visit</span>
      <a class="ucsx ucsxhover" target=”_blank” href="${homepageURL}">homepage</a>
      <span>for more info.</span>
    </div>
  `;
  var warningPanel = `
    <div class="ucsx">
      <span>WARNING: Do not refresh the page or you will lose your progress!</span>
    </div>
  `;
  var mainPanel = `
    <div class="ucsx">
      <span>&nbsp&nbsp&nbsp&nbsp&nbsp&nbspActions:</span>
      <a href="#" class="ucsx ucsxhover" title="Restart subreddit-scanner script." id="${idLinkPlotly}">VIEW GRAPH ON PLOT.LY</a>
      <span>&nbsp|&nbsp</span>
      <a href="#" class="ucsx ucsxhover" title="Export collected data in CSV file." id="${idLinkExport}">EXPORT CSV</a>
      <span>&nbsp|&nbsp</span>
      <a href="#" class="ucsx ucsxhover" title="Restart subreddit-scanner script." id="${idLinkRestart}">START SCRIPT</a>
    </div>
  `;
  var freqPanel = `
    <div class="ucsx">
      <span>Capture delay:</span>
      <span style="color:#999;">Every&nbsp&nbsp</span>
      <a href="#" class="ucsxhover ucsxbold" id="${idLinkCaptureDelayDecrease}">&nbsp—&nbsp</a>
      <span id="${idSpanCaptureDelay}">5</span>
      <a href="#" class="ucsxhover ucsxbold" id="${idLinkCaptureDelayIncrease}">&nbsp+&nbsp</a>
      <span style="color:#999;">&nbsp&nbspminute(s).</span>
    </div>
  `;
  var statPanel = `
    <div class="ucsx">
      <ul style="list-style:none;">
        <li>
        <span>&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbspStatus:</span>
        <span>Monitor started on:</span>
        <span id="${idSpanStartDate}">---</span>
        </li>
        <li>
        <span>&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp</span>
        <span>Monitoring ${document.location.href.match(/\/r\/(.+?)\//)[0]}.</span>
        <span>Time running:</span>
        <span id="${idSpanTimeRunning}">---</span>
        </li>
        <li>
        <span>&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp</span>
        <span id="${idSpanEntriesCollected}">0</span>
        <span>entry(ies) collected so far.</span>
        </li>
        <li>
        <span>&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp</span>
        <span id="${idSpanSecondsToNextQuery}">Awaiting start command...</span>
        </li>
      </ul>
    </div>
  `;
  var wrapperDiv = '<div class="ucsxwrapr">' 
    + welcomePanel + warningPanel + mainPanel + freqPanel + statPanel + '</div>';
  document.body.insertAdjacentHTML("afterbegin", wrapperDiv);
}
