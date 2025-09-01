// Configuration
var folder = "digits/";
var fileMap = {
  1: "one.wav", 2: "two.wav", 3: "three.wav", 4: "four.wav",
  5: "five.wav", 6: "six.wav", 7: "seven.wav", 8: "eight.wav", 9: "nine.wav"
};
var startingSpan = 3;
var maxSpan = 9;
var currentSpan = startingSpan;
var spanTrialCount = 0;
var spanCorrectCount = 0;
var maxSpanPassed = 0;
var response = [];
var fds_correct_ans = [];
var trialNum = 0;
var audioContext;

// Helpers
function digitToFile(d) { return folder + fileMap[d]; }
function shuffle(arr) {
  for(let i=arr.length-1; i>0; i--){
    let j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}
function getDigitList(len) {
  let res = [];
  while(res.length < len){
    res = res.concat(shuffle([...Array(9).keys()].map(x => x+1)));
  }
  return res.slice(0, len);
}
function createAudioTrials(digitSeq) {
  return digitSeq.map(digit => ({
    type: 'audio-keyboard-response',
    stimulus: digitToFile(digit),
    choices: jsPsych.NO_KEYS,
    trial_ends_after_audio: true,
    post_trial_gap: 250
  }));
}
function recordClick(elm) {
  response.push(Number(elm.innerText.trim()));
  document.getElementById("echoed_txt").innerHTML = response.join(" ");
}
function clearResponse() {
  response = [];
  document.getElementById("echoed_txt").innerHTML = "";
}

// Preload audio files
var preload = {
  type: 'preload',
  audio: Object.values(fileMap).map(f => folder + f)
};

// Welcome screen
var welcome = {
  type: 'html-button-response',
  stimulus: `
    <h2>Forward Digit Span Task</h2>
    <p>Audio only</p>
    <p>Press Continue to start.</p>`,
  choices: ['Continue'],
  on_finish: () => {
    if(!audioContext){
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if(audioContext.state === 'suspended'){
      audioContext.resume();
    }
  }
};

// Setup trial info screen
var setupTrial = {
  type: 'html-button-response',
  stimulus: () => `
    <p>Trial ${spanTrialCount + 1} of 2 at span length: ${currentSpan}</p>
    <p>Max span so far: ${maxSpanPassed}</p>`,
  choices: ['Begin'],
  on_finish: () => {
    fds_correct_ans = getDigitList(currentSpan);
    response = [];
  }
};

// Response screen HTML
var responseGridHTML = `
<div style="text-align:center;">
  <p>What were the numbers <b>in order</b>?</p>
  ${Array.from({length:9}, (_,i) => `<button class="num-button">${i+1}</button>`).join('')}
  <br><br><br>
  <button id="clearBtn">Clear</button>
  <div><b>Current Answer:</b> <span id="echoed_txt"></span></div>
</div>`;

// Response screen trial
var responseTrial = {
  type: 'html-button-response',
  stimulus: responseGridHTML,
  choices: ['Submit Answer'],
  on_load: () => {
    // Attach button handlers
    document.querySelectorAll('.num-button').forEach(btn => {
      btn.onclick = () => recordClick(btn);
    });
    document.getElementById('clearBtn').onclick = clearResponse;
  },
  on_finish: () => {
    trialNum++;
    const correct = response.length === fds_correct_ans.length 
                    && response.every((v,i) => v === fds_correct_ans[i]);
    spanTrialCount++;
    if(correct){
      spanCorrectCount++;
      if(currentSpan > maxSpanPassed) maxSpanPassed = currentSpan;
    }
    if(spanTrialCount === 2){
      if(spanCorrectCount === 0){
        jsPsych.endExperiment(`Two consecutive errors at span ${currentSpan}. Final digit span: ${maxSpanPassed}.`);
      } else {
        currentSpan++;
        if(currentSpan > maxSpan){
          jsPsych.endExperiment(`Maximum span ${maxSpan} reached. Final digit span: ${maxSpanPassed}.`);
        }
      }
      spanTrialCount = 0;
      spanCorrectCount = 0;
    }
    response = [];
  }
};

// Main trial loop with dynamic audio timeline generation
var trialLoop = {
  timeline: [
    setupTrial,
    {
      timeline: function() {
        return createAudioTrials(fds_correct_ans);
      }
    },
    responseTrial
  ],
  loop_function: () => currentSpan <= maxSpan,
  on_timeline_start: () => {
    fds_correct_ans = getDigitList(currentSpan);
    response = [];
  }
};

// Full timeline
var timeline = [preload, welcome, trialLoop];

// Initialize jsPsych
jsPsych.init({
  timeline: timeline
});
