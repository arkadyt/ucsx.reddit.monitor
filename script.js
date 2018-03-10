// ==UserScript==
// @name     Unnamed Script 958998
// @version  1
// @grant    none
// ==/UserScript==

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


var database = "ARCPFLOG_DATABASE";
var start_time = "ARCPFLOG_START_TIME";
var initialized =  "ARCPFLOG_INITIALIZED";

async function startEntriesCollection() {
  // Find the counter in the DOM and get the count.
  var number = document.getElementsByClassName("users-online")[0].children[0].innerHTML;
  // Prepare entry to be inserted in the cookie.
  var str = getCookie(database) + number.split(' ').join('') + ",";
  // Insert.
  document.cookie = database  + "=" + str;
  // Print cookie contents out for future dumps.
  console.log(str);
  // Time delay between two consequent entries.
  await sleep(300000);
  // Refreshing the page and GreaseMonkey restarts the script.
  location.reload();
}

function initializeRestart() {
	// Wipe the database cookie
	document.cookie = database + "=";
	// Set the starting time point
	document.cookie = start_time + "=" + new Date().getTime();
	// Reset the initialized flag
	document.cookie = initialized + "=1";
}

if (getCookie(initialized) !== "1") {
	initializeRestart();
}
startEntriesCollection();
