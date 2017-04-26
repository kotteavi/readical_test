// based on Levenshtein distance, it checks the similarity between two words 
function similarity(s1, s2) {
    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength == 0) {
        return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
        var lastValue = i;
        for (var j = 0; j <= s2.length; j++) {
            if (i == 0)
                costs[j] = j;
            else {
                if (j > 0) {
                    var newValue = costs[j - 1];
                    if (s1.charAt(i - 1) != s2.charAt(j - 1))
                        newValue = Math.min(Math.min(newValue, lastValue),
                            costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0)
            costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

var paragraphs = document.getElementById("chap").querySelectorAll("p");

var p1 = paragraphs[0];

var words = p1.innerHTML.split(" ");
words = words.filter(e => String(e).trim());
//   console.log(words);
p1.innerHTML = "";


var alternativeTimestamps = [];
var timestamps = [];
for (let i = 0; i < watsonResults.length; i++) {

    if (watsonResults[i].result_index != i) {
        console.log("missing result:  " + i);
    }
    timestamps = watsonResults[i].results[0].alternatives[0].timestamps;
    alternativeTimestamps = alternativeTimestamps.concat(timestamps);
}

console.log(alternativeTimestamps);

function createMeta(arr) {
    let meta = {};
    for (let i = 0; i < words.length; i++) {
        meta.word = arr[i];
        meta.time_stamp = [];
        meta.time_stamp_index = -1;
        arr[i] = meta;
        meta = {};
    }
}
createMeta(words);

var stampMatch = 0;

function findMatched(originals, timestamps) {
    for (let o = 0; o < originals.length; o++) {

        var original = originals[o];
        var orgWord = removePunctuation(original.word);
        for (let t = stampMatch; t < timestamps.length; t++) {
            // consider the ss.. in which case stop 
            // it fixes it self over time of course 
            if (t == stampMatch + 8) {
                // stampMatch = stampMatch + 1;
                break;
            }

            var timestamp = timestamps[t];
            var transWord = removePunctuation(timestamp[0]);

            if (orgWord == transWord || similarity(orgWord, transWord) > .75) {
                original.time_stamp = timestamp;
                original.time_stamp_index = t;
                stampMatch = t + 1;
                break;
            }
        }
    }
}

function fixUnmatched(originals, timestamps) {
    var hasStampIndex = null;
    var nextHasStampIndex = null;

    var prevMatched = null;
    var nextMatched = null;

    for (var i = 0; i < originals.length; i++) {
        hasStampIndex = originals[i].time_stamp_index != -1;

        if (hasStampIndex && prevMatched == null) {
            prevMatched = i;
        } else if (hasStampIndex && ((prevMatched + 1) == i)) {
            prevMatched = i;
        }
        else if (hasStampIndex && prevMatched != null) {
            nextMatched = i;
        }

        if (prevMatched != null && nextMatched != null) {
            addMissingTimestamps(prevMatched, nextMatched, originals, timestamps);

            prevMatched = null;
            nextMatched = null;

            if (i != originals.length - 1) {
                nextHasNoStampIndex = originals[i + 1].time_stamp_index == -1;
                if (nextHasNoStampIndex && prevMatched == null) {
                    prevMatched = i;
                }
            }

        }

        if ((i == originals.length - 1) && !hasStampIndex) {
            var start = originals[prevMatched].time_stamp[2];
            var end = timestamps[timestamps.length - 1][2];
            originals[originals.length - 1].time_stamp = ['', start, end];
        }


    }
}

function addMissingTimestamps(prevIndex, nextIndex, originals, timestamps) {

    var timeDiff = originals[nextIndex].time_stamp[1] - originals[prevIndex].time_stamp[2];


    var betweenIndexes = [];
    for (let i = prevIndex + 1; i < nextIndex; i++) {
        betweenIndexes.push(i);
    }
    var diff = betweenIndexes.length;

    var totalLength = 0;
    var wordsLengths = [];
    for (let i = 0; i < diff; i++) {
        var word = originals[betweenIndexes[i]].word
        wordsLengths.push(word.length);
        totalLength = totalLength + word.length;
    }

    var timeDistances = [];
    var seconds = 0.0;
    for (let i = 0; i < wordsLengths.length; i++) {
        seconds = (wordsLengths[i] / totalLength) * timeDiff;
        timeDistances.push(seconds);
    }

    var prevEndTime = originals[prevIndex].time_stamp[2];
    var index = 0;
    for (let i = 0; i < diff; i++) {
        originals[betweenIndexes[i]].time_stamp = ['', prevEndTime, prevEndTime + timeDistances[index]];
        prevEndTime = prevEndTime + timeDistances[index];
        index++;
    }
}


function removePunctuation(str) {
    var punctuationless = str.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    return (punctuationless.replace(/\s{2,}/g, " ")).toLowerCase().trim();
}

findMatched(words, alternativeTimestamps);
fixUnmatched(words, alternativeTimestamps);
console.log(words);

var subtitles = document.getElementById("subtitles");
function createSubtitleTest(syncData) {
    var element;
    var stamps = [];
    var begin = '';
    var end = '';
    var className = '';
    var idName = '';
    for (var i = 0; i < syncData.length; i++) {
        stamps = syncData[i].time_stamp;
        begin = stamps[1];
        end = stamps[2];

        idName = 'word_' + i + '_' + begin + '_' + end;
        begin = Math.floor(begin);
        className = 'group_' + begin;

        element = document.createElement('span');
        element.setAttribute("id", idName);
        element.setAttribute("class", className + " wordSpan");
        element.innerText = syncData[i].word + " ";
        subtitles.appendChild(element);
    }
};
createSubtitleTest(words);

var audioPlayer = document.getElementById("audiofile");
var subtitles = document.getElementById("subtitles");
var syncData = words;
var currTime = 0.0;
var flatTime = 0.0;
var prevFlatTime = -1.0;
var className = '';
var elements;
var prevElements;
var scrolled = false;

audioPlayer.addEventListener("timeupdate", function (e) {
    currTime = audioPlayer.currentTime;
    flatTime = Math.floor(currTime);

    if (flatTime != prevFlatTime) {
        className = 'group_' + flatTime;
        elements = document.getElementsByClassName(className);
        for (let i = 0; i < elements.length; i++) {
            elements[i].style.background = 'yellow';
            if (!verge.inViewport(elements[i])) {
                elements[i].scrollIntoView(true);
                scrolled = true;
            }
        }
    }

    // unhilight prev word or phrase
    if (flatTime > prevFlatTime || flatTime < prevFlatTime) {
        className = 'group_' + prevFlatTime;
        elements = document.getElementsByClassName(className);
        for (let i = 0; i < elements.length; i++) {
            elements[i].style.background = '';
        }
        prevFlatTime = flatTime;
    }

    console.log(currTime);

});


var wordSpans = document.querySelectorAll('.wordSpan');

var topWordSpan = null;
var wordTimeStamp = null;
// Update player based on top most word
window.addEventListener('scroll', function (e) {
    if (scrolled) {
        scrolled = false;
    }
    else {
        topWordSpan = mostVisible(wordSpans);
        wordTimeStamp = topWordSpan.getAttribute('class').split(" ")[0].split('_')[1];
        audioPlayer.currentTime = wordTimeStamp;
    }

}, true);