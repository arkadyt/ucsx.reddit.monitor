## What is it
Script cyclically records count of online users for any given subreddit. You can use it's output to plot graphs.<br/>
Script uses [GreaseMonkey plugin](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/).

## How to use
Script provides you with the raw data that is to be used in graph building software afterwards. First let's talk about setting things up.

### Setting up
* Add [greasemonkey extention](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/) into your Firefox browser.
* Copy-Paste [this script](https://raw.githubusercontent.com/arcan770077f/reddit-scanner/master/script.js) into greasemonkey via plugin menu > `New user script...`
* Ensure that your custom script is not yet active.
* Open up the subreddit of your choice, then open the most lightweight page you can find (for performance reasons, if you care). This can be some tiny wiki page or some small thread that has went unnoticed. Make sure that the page has usual subbredit side panel.
* Activate the script via greasemonkey plugin menu.

Page will start refreshing every 5 minutes. From now on keep it open for as long as needed. You can detach the page tab and fold the browser window.

### Maintaining the script
By default script makes a capture every 5 minutes. You can adjust the frequency but should only decrement it because multiple cookies are not supported as of yet. You have exactly 4093 bytes of space.<br/>
With the speed of 6 bytes per 5 minutes (which is 5 digits plus separator) you get 56 hours at most before you will need to dump captured data and restart the whole process.
 
#### How to dump data
* In the browser hit F12 to open up the developer tools.
* Navigate to the 'Console' tab. In the list find a line with a bunch of numbers separated by spaces.
* Right click on the line > Copy.

#### How to restart the script
* Right click anywhere on page > View Page info > Protection (Lock image) > View cookies
* Here find the ARCPFLOG_INITIALIZED cookie and delete it via right click menu.

That's it. The process will restart with the next page refresh.<br/>
I recommend doing dumps every 48 hours.

Now that you are all set, let's see how we can build graphs.

## How to build graphs
I will demonstrate it using excel.

Assuming you've already copied script output from the browser console, convert it into the column view for easy paste in the excel. You can do it
* Using notepad++: Replace spaces with \n (activate extended characters toggle in the replace window).<br/>
* Using vim: `%s/ /\r/g`

Now that you have got quantity entries ready, you lack only one thing to be able to build a graph. You need to calculate respective time points. <br/>
Open up the cookies window again and find ARCPFLOG_START_TIME cookie. That's the time when the capture process started.<br/>
Given the starting point and fixed capture time period we can calculate the rest of them. 

Easy excel trick: 
* Insert two time entries in two vertical cells with a step of five minutes
* Highlight them both
* Do as described [here](https://www.youtube.com/watch?time_continue=84)

[And finally build the graph.](https://www.youtube.com/watch?v=Xn7Sd5Uu42A)
