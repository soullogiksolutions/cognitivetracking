/***************************************
* Forward Digit Span (Mobile-Friendly) *
****************************************/

// ---------- Main Control Vars ----------
var useAudio = null;      // chosen by user at start
var fdsTotalTrials = null; // chosen by user at start
var startingSpan = 3;
var currentSpan;
var fdsTrialNum = 1;
var wrongCount = 0;       // ❗ new: counts wrong answers
var maxSpan = 0;          // ❗ new: track highest span achieved
var response = [];
var fds_correct_ans;

// Utility
const arrSum = arr => arr.reduce((a,b) => a + b, 0);
var digit_list = [1,2,3,4,5,6,7,8,9];

function shuffle(a) { /* fisher-yates */ 
  for (let i=a.length-1; i>0; i--) {
    let j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

// Generate digit list
function getDigitList(len) {
  let shuff_final = shuffle([...digit_list]);
  if(len > digit_list.length){
    while(shuff_final.length < len) {
      shuff_final = [...shuff_final, ...shuffle([...digit_list])];
    }
  }
  return shuff_final.slice(0,len);
}

// Convert to stimuli
function getStimuli(numDigits) {
  let stimList = [];
  let digits = getDigitList(numDigits);
  fds_correct_ans = digits;
  for (let d of digits) {
    if(useAudio) stimList.push("digits/" + d + ".wav"); 
    else stimList.push('<p style="font-size:50px;">'+d+'</p>');
  }
  return stimList;
}

// Record clicks
function recordClick(elm) {
  response.push(Number(elm.innerText));
  document.getElementById("echoed_txt").innerHTML = response.join(" ");
}
function clearResponse() {
  response = [];
  document.getElementById("echoed_txt").innerHTML = "";
}

// ---------- Screens ----------

// 1. Welcome + Option Selector
var fds_welcome = {
  type: "html-button-response",
  stimulus: `
    <h2>Welcome to the Digit Span Task</h2>
    <p>You will see or hear digit sequences, then recall them in order.</p>
    <p>Please select your options below:</p>
    <label><b>Mode:</b></label><br>
    <button id="mode-aud">Audio</button>
    <button id="mode-vis">Visual</button>
    <p><label><b>Number of Trials:</b></label><br>
      <input type="number" id="trialChoice" value="12" min="3" max="50" style="font-size:20px;">
    </p>
    <p>Then press Continue to start.</p>
  `,
  choices: ['Continue'],
  on_finish: function(){
    useAudio = document.getElementById("mode-aud").classList.contains("active");
    fdsTotalTrials = parseInt(document.getElementById("trialChoice").value);
    currentSpan = startingSpan;
  }
};

// 2. Setup screen per trial
var setup_fds = {
  type: 'html-button-response',
  stimulus: function(){
    return `<p>Trial ${fdsTrialNum} of ${fdsTotalTrials}</p>
            <p><b>Current Span:</b> ${currentSpan} | 
            <b>Max Span:</b> ${maxSpan} | 
            <b>Wrong so far:</b> ${wrongCount}/3</p>`;
  },
  choices: ['Begin'],
  on_finish: function(){
    stimList = getStimuli(currentSpan);
  }
};

// 3. Stimulus presentation
var letter_fds = {
  type: 'audio-keyboard-response',
  stimulus: function(){ return stimList[idx]; },
  choices: jsPsych.NO_KEYS,
  trial_ends_after_audio: true,
  on_finish: function(){
    idx++;
    exitLetters = (idx === stimList.length);
  }
};

var letter_fds_vis = {
  type: 'html-keyboard-response',
  stimulus: function(){ return stimList[idx]; },
  choices: jsPsych.NO_KEYS,
  trial_duration: 700,
  on_finish: function(){
    idx++;
    exitLetters = (idx === stimList.length);
  }
};

var letter_proc = {
  timeline: function(){ return useAudio ? [letter_fds] : [letter_fds_vis]; }(),
  loop_function: ()=> exitLetters==0
};

// 4. Response screen (with Submit button!)
var fds_response_screen = {
  type: 'html-button-response',
  stimulus: `
    <div class="numbox">
      <p>What were the numbers <b>in order</b>?</p>
      <div id="buttongrid">
        ${[1,2,3,4,5,6,7,8,9].map(d=>`
         <button class="num-button" onclick="recordClick(this)">${d}</button>`).join("")}
      </div>
      <button onclick="clearResponse()" class="clear_button">Clear</button>
      <div><b>Current Answer:</b> <span id="echoed_txt"></span></div>
    </div>`,
  choices: ['Submit Answer'],
  on_finish: function(){
    var curans = response.slice();
    var corans = fds_correct_ans;
    if(JSON.stringify(curans)===JSON.stringify(corans)){
      // Correct
      if(currentSpan>maxSpan) maxSpan = currentSpan;
    } else {
      wrongCount++;
    }
    response = [];
    fdsTrialNum++;
  }
};

// 5. Check stopping conditions
var staircase_assess = {
  type: 'call-function',
  func: function(){
    if(fdsTrialNum > fdsTotalTrials || wrongCount>=3) return false;
    else return true;
  }
};

// 6. Wrap up
var fds_wrapup = {
  type: 'html-button-response',
  stimulus: function(){
    return `<h2>Task Complete</h2>
            <p>Your final <b>Digit Span Score</b>: ${maxSpan}</p>
            <p>Thank you for participating!</p>`;
  },
  choices: ['Exit']
};

// ---------- Timeline ----------
var fds_adaptive = {
  timeline: [fds_welcome, setup_fds, letter_proc, fds_response_screen],
  loop_function: function(){
    return !(fdsTrialNum > fdsTotalTrials || wrongCount>=3);
  }
};

timeline.push(fds_adaptive);
timeline.push(fds_wrapup);
