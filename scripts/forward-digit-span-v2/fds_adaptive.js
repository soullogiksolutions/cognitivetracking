/*** Forward Digit Span Adaptive Task ***/

// Global variables
var useAudio = true;
var currentDigitList;
var maxSpan = 0;
var folder = "digits/";
var fdsTrialNum = 1;
var fdsTotalTrials = 12;
var response = [];
var fds_correct_ans;
var digit_list = [1,2,3,4,5,6,7,8,9];
var startingSpan = 3;
var currentSpan;
var stimList;
var idx = 0;
var exitLetters = false;
var wrongCount = 0;
var spanHistory = [];

function shuffle(arr) {
  var j, temp, i;
  for (i=arr.length-1; i>0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

function getDigitList(len){
  var baseShuffled = [];
  if(len <= digit_list.length) {
    baseShuffled = shuffle([...digit_list]);
  } else {
    baseShuffled = [];
    while(baseShuffled.length < len){
      baseShuffled = [...baseShuffled, ...shuffle([...digit_list])];
    }
  }
  return baseShuffled.slice(0,len);
}

function getStimuli(len){
  stimList = [];
  currentDigitList = getDigitList(len);
  for(let i=0; i<currentDigitList.length; i++){
    if(useAudio){
      stimList.push(folder + currentDigitList[i] + ".wav");
    } else {
      stimList.push('<p style="font-size:60px; font-weight:600; text-align:center;">' + currentDigitList[i] + '</p>');
    }
  }
  fds_correct_ans = [...currentDigitList];
  return stimList;
}

function recordClick(elm){
  response.push(Number(elm.innerText));
  document.getElementById("echoed_txt").innerHTML = response.join(" ");
}

function clearResponse(){
  response = [];
  document.getElementById("echoed_txt").innerHTML = "";
}

// Welcome screen
var fds_welcome = {
  type: 'html-button-response',
  stimulus: `
    <h2>Forward Digit Span Task</h2>
    <p>Select presentation mode (Audio or Visual):</p>
    <button id="audioBtn" style="margin-right:10px; font-size:20px;">Audio</button>
    <button id="visualBtn" style="font-size:20px;">Visual</button>
    <p>Number of trials:</p>
    <input type="number" id="numTrials" value="12" min="3" max="50" style="font-size:18px; width:60px;">
    <p>When ready, press Continue.</p>
  `,
  choices: ['Continue'],
  on_load: function(){
    $('#audioBtn').css('background-color', '#4CAF50');
    $('#visualBtn').css('background-color', '');
    $('#audioBtn').click(function(){
      useAudio = true;
      $('#audioBtn').css('background-color', '#4CAF50');
      $('#visualBtn').css('background-color', '');
    });
    $('#visualBtn').click(function(){
      useAudio = false;
      $('#visualBtn').css('background-color', '#4CAF50');
      $('#audioBtn').css('background-color', '');
    });
  },
  on_start: function() {
    // Get input value safely while DOM intact
    var nt = $('#numTrials').val();
    this.data = { numTrials: nt };
  },
  on_finish: function(data) {
    let nt = parseInt(data.numTrials);
    if(!isNaN(nt) && nt >= 3 && nt <= 50){
      fdsTotalTrials = nt;
    }
    currentSpan = startingSpan;
    fdsTrialNum = 1;
    wrongCount = 0;
    maxSpan = 0;
    spanHistory = [];
    jsPsych.data.addProperties({BDS_modality: useAudio ? 'auditory' : 'visual'});
  }
};

// Setup trial screen showing progress
var setup_fds = {
  type: 'html-button-response',
  stimulus: function() {
    return `<p>Trial ${fdsTrialNum} of ${fdsTotalTrials}</p>
            <p>Current Span: <b>${currentSpan}</b> | Max Span: <b>${maxSpan}</b> | Wrong Attempts: <b>${wrongCount}/3</b></p>`;
  },
  choices: ['Begin'],
  post_trial_gap: 500,
  on_finish: function() {
    stimList = getStimuli(currentSpan);
    idx = 0;
    exitLetters = false;
    spanHistory[fdsTrialNum-1] = currentSpan;
  }
};

var letter_fds = {
  type: 'audio-keyboard-response',
  stimulus: function() { return stimList[idx]; },
  choices: jsPsych.NO_KEYS,
  trial_ends_after_audio: true,
  post_trial_gap: 250,
  on_finish: function() {
    idx++;
    if(idx >= stimList.length) exitLetters = true;
  }
};

var letter_fds_vis = {
  type: 'html-keyboard-response',
  stimulus: function() { return stimList[idx]; },
  choices: jsPsych.NO_KEYS,
  trial_duration: 700,
  post_trial_gap: 250,
  on_finish: function() {
    idx++;
    if(idx >= stimList.length) exitLetters = true;
  }
};

var letter_proc_audio = {
  timeline: [letter_fds],
  loop_function: function() {
    return !exitLetters;
  }
};

var letter_proc_visual = {
  timeline: [letter_fds_vis],
  loop_function: function() {
    return !exitLetters;
  }
};

var response_grid =
  '<div style="text-align:center;">' +
  '<p>What were the numbers <b>in order</b>?</p>' +
  Array.from({length:9}, (_,i) => `<button class="num-button">${i+1}</button>`).join('') +
  '<br>' +
  '<button class="clear-button" id="clearBtn">Clear</button>' +
  '<div><b>Current Answer:</b> <span id="echoed_txt"></span></div>' +
  '</div>';

var fds_response_screen = {
  type: 'html-button-response',
  stimulus: response_grid,
  choices: ['Submit Answer'],
  on_load: function() {
    $('.num-button').click(function() {
      recordClick(this);
    });
    $('#clearBtn').click(function() {
      clearResponse();
    });
  },
  on_finish: function() {
    var curans = response.slice();
    var corans = fds_correct_ans;
    var correct = (JSON.stringify(curans) === JSON.stringify(corans));
    if(correct) {
      if(currentSpan > maxSpan) maxSpan = currentSpan;
      currentSpan++;
    } else {
      wrongCount++;
      if(wrongCount < 3 && currentSpan > 1) currentSpan--;
    }
    response = [];
    fdsTrialNum++;
    jsPsych.data.addDataToLastTrial({
      designation: 'FDS-RESPONSE',
      span: currentSpan,
      answer: curans,
      correct: corans,
      was_correct: correct,
      spanHistory: spanHistory
    });
  }
};

var fds_wrapup = {
  type: 'html-button-response',
  stimulus: function() {
    return `<p>Thank you for participating. This concludes the forward digit span task.</p>
            <p><b>Your final digit span score:</b> ${maxSpan}</p>`;
  },
  choices: ['Exit']
};

// Compose timeline dynamically based on useAudio choice after welcome
var timeline = [];

timeline.push(fds_welcome);
timeline.push(setup_fds);

if(useAudio){
  timeline.push(letter_proc_audio);
} else {
  timeline.push(letter_proc_visual);
}

timeline.push(fds_response_screen);
timeline.push(fds_wrapup);

jsPsych.init({
  timeline: timeline
});
