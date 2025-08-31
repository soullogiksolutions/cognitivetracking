<script>

/***************************************
* Forward Digit Span (Mobile-Friendly) *
****************************************/

// ---------- Main Control Vars ----------
var useAudio = true;       // Will be chosen at start
var fdsTotalTrials = 12;   // Will be chosen at start
var startingSpan = 3;
var currentSpan;
var fdsTrialNum = 1;
var wrongCount = 0;         // Track number of mistakes
var maxSpan = 0;            // Track highest span correctly recalled
var response = [];
var fds_correct_ans;
var stimList = [];
var idx = 0;
var exitLetters = 0;

// Utility
function shuffle(a) {
  for (let i=a.length-1; i>0; i--) {
    let j = Math.floor(Math.random() * (i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

var digit_list = [1,2,3,4,5,6,7,8,9];

// Generate digit list
function getDigitList(len) {
  let shuff_final = shuffle([...digit_list]);
  if (len > digit_list.length) {
    while (shuff_final.length < len) {
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
    if (useAudio) stimList.push("digits/" + d + ".wav"); 
    else stimList.push('<p style="font-size:50px;text-align:center;">'+d+'</p>');
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
    <p><b>Please select your options below:</b></p>

    <div style="margin:10px;">
      <button id="mode-aud" onclick="
        document.getElementById('mode-aud').classList.add('active');
        document.getElementById('mode-vis').classList.remove('active');
      " style="font-size:20px;margin:5px;">Audio</button>

      <button id="mode-vis" onclick="
        document.getElementById('mode-vis').classList.add('active');
        document.getElementById('mode-aud').classList.remove('active');
      " style="font-size:20px;margin:5px;">Visual</button>
    </div>

    <div style="margin:10px;">
      <label>Number of Trials:</label><br>
      <input type="number" id="trialChoice" value="12" min="3" max="50" style="font-size:20px;width:80px;">
    </div>

    <p>Then press Continue to start.</p>
  `,
  choices: ['Continue'],
  on_finish: function(){
    // Default = Audio if user never clicked
    useAudio = document.getElementById("mode-vis").classList.contains("active") ? false : true;
    fdsTotalTrials = parseInt(document.getElementById("trialChoice").value);
    currentSpan = startingSpan;
    fdsTrialNum = 1;
    wrongCount = 0;
    maxSpan = 0;
  }
};

// 2. Setup screen per trial
var setup_fds = {
  type: 'html-button-response',
  stimulus: function(){
    return `
      <p><b>Trial ${fdsTrialNum} of ${fdsTotalTrials}</b></p>
      <p>Current Span: <b>${currentSpan}</b> |
         Max Span: <b>${maxSpan}</b> |
         Wrong: <b>${wrongCount}/3</b></p>
    `;
  },
  choices: ['Begin'],
  on_finish: function(){
    stimList = getStimuli(currentSpan);
    idx = 0;
    exitLetters = 0;
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
  post_trial_gap: 200,
  on_finish: function(){
    idx++;
    exitLetters = (idx === stimList.length);
  }
};

var letter_proc = {
  timeline: [ ],
  on_timeline_start: function(){
    if(useAudio){
      letter_proc.timeline = [letter_fds];
    } else {
      letter_proc.timeline = [letter_fds_vis];
    }
  },
  loop_function: ()=> exitLetters==0
};

// 4. Response screen (with Submit button!)
var fds_response_screen = {
  type: 'html-button-response',
  stimulus: `
    <div style="text-align:center;">
      <p>What were the numbers <b>in order</b>?</p>
      <div id="buttongrid" style="display:flex;flex-wrap:wrap;justify-content:center;max-width:300px;margin:0 auto;">
        ${[1,2,3,4,5,6,7,8,9].map(d=>`
          <button class="num-button" style="font-size:22px;margin:5px;width:60px;height:60px;"
            onclick="recordClick(this)">${d}</button>`).join("")}
      </div>
      <button onclick="clearResponse()" class="clear_button" style="font-size:18px;margin:10px;">Clear</button>
      <div><b>Current Answer:</b> <span id="echoed_txt" style="font-size:22px;color:blue;"></span></div>
    </div>`,
  choices: ['Submit Answer'],
  on_finish: function(){
    var curans = response.slice();
    var corans = fds_correct_ans;
    if(JSON.stringify(curans)===JSON.stringify(corans)){
      if(currentSpan > maxSpan) maxSpan = currentSpan;
      currentSpan++; // increase difficulty
    } else {
      wrongCount++;
      if(wrongCount < 3 && currentSpan > 1){ currentSpan--; } // drop span but not below 1
    }
    response = [];
    fdsTrialNum++;
  }
};

// 5. Wrap up
var fds_wrapup = {
  type: 'html-button-response',
  stimulus: function(){
    return `
      <h2>Task Complete</h2>
      <p>Your final <b>Digit Span Score</b>: ${maxSpan}</p>
      <p>Thank you for participating!</p>`;
  },
  choices: ['Exit']
};

// ---------- Timeline ----------
var fds_adaptive = {
  timeline: [fds_welcome, setup_fds, letter_proc, fds_response_screen],
  loop_function: function(){
    return !(fdsTrialNum > fdsTotalTrials || wrongCount >= 3);
  }
};

timeline.push(fds_adaptive);
timeline.push(fds_wrapup);

</script>
