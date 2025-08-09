/* -----------------------
   Firebase Config
------------------------ */
const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_APIKEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

if (typeof firebase !== "undefined") {
  firebase.initializeApp(firebaseConfig);
  var db = firebase.database();
}

/* -----------------------
   Questions Data
------------------------ */
const questionsByTopic = {
  python_basics: [
    {id:'py1', text:'What is the extension for Python files?', options:['.py','.java','.js'], correctIndex:0, marks:1},
    {id:'py2', text:'Which keyword defines a function in Python?', options:['func','def','function'], correctIndex:1, marks:1},
    {id:'py3', text:'Which data type is immutable?', options:['list','tuple','set'], correctIndex:1, marks:1},
    {id:'py4', text:'What does len("hello") return?', options:['4','5','6'], correctIndex:1, marks:1},
    {id:'py5', text:'Which operator is used for exponentiation?', options:['^','**','pow()'], correctIndex:1, marks:1}
  ],
  js_basics: [
    {id:'js1', text:'Which keyword declares a block-scoped variable?', options:['var','let','const'], correctIndex:1, marks:1},
    {id:'js2', text:'Which symbol is used for comments?', options:['//','#','<!-- -->'], correctIndex:0, marks:1}
  ],
  data_structures: [
    {id:'ds1', text:'Which data structure uses FIFO?', options:['Stack','Queue','Tree'], correctIndex:1, marks:1}
  ],
  ai_intro: [
    {id:'ai1', text:'Which algorithm is supervised?', options:['Kmeans','Linear Regression','Apriori'], correctIndex:1, marks:1}
  ]
};

/* -----------------------
   Local Storage Helpers
------------------------ */
function saveState(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}
function loadState(key){
  const val = localStorage.getItem(key);
  return val ? JSON.parse(val) : null;
}
function clearState(){
  localStorage.clear();
}

/* -----------------------
   START PAGE LOGIC
------------------------ */
const startBtn = document.getElementById('startBtn');
if(startBtn){
  startBtn.onclick = () => {
    const name = document.getElementById('name').value.trim();
    const sid = document.getElementById('sid').value.trim();
    const topic = document.getElementById('topicSelect').value;
    const quizTime = parseInt(document.getElementById('quizTime').value) || 5;
    const qTime = parseInt(document.getElementById('qTime').value) || 30;
    if(!name || !sid || !topic){
      alert("Please fill all fields");
      return;
    }
    saveState('quizData', {name, sid, topic, quizTime, qTime, answers:{}, currentIndex:0});
    window.location.href = "quiz.html";
  };
}

/* -----------------------
   QUIZ PAGE LOGIC
------------------------ */
const quizArea = document.getElementById('quizArea');
if(quizArea){
  let quizData = loadState('quizData');
  if(!quizData){ window.location.href = "start.html"; }

  let {name, sid, topic, quizTime, qTime, answers, currentIndex} = quizData;
  let questions = (questionsByTopic[topic] || []).slice();

  document.getElementById('currentTopic').textContent = topic.replace(/_/g, ' ');
  document.getElementById('currentStudent').textContent = `${name} (${sid})`;

  // timers
  let globalSeconds = quizTime * 60;
  let perQSeconds = qTime;
  let qTimer, globalTimer;

  function startTimers(){
    globalTimer = setInterval(()=>{
      globalSeconds--;
      updateGlobalTimer();
      if(globalSeconds <= 0) submitQuiz('Global time ended');
    },1000);
    resetQTimer();
  }
  function updateGlobalTimer(){
    document.getElementById('globalTimer').textContent = 
      `${String(Math.floor(globalSeconds/60)).padStart(2,'0')}:${String(globalSeconds%60).padStart(2,'0')}`;
  }
  function resetQTimer(){
    if(qTimer) clearInterval(qTimer);
    let timeLeft = perQSeconds;
    document.getElementById('qTimer').textContent = timeLeft;
    qTimer = setInterval(()=>{
      timeLeft--;
      document.getElementById('qTimer').textContent = timeLeft;
      if(timeLeft <= 0) nextQuestion(true);
    },1000);
  }

  function renderQuestion(){
    const q = questions[currentIndex];
    document.getElementById('qIndex').textContent = currentIndex+1;
    document.getElementById('qTotal').textContent = questions.length;
    document.getElementById('questionBlock').innerHTML = `
      <p>${q.text}</p>
      <div class="options">
        ${q.options.map((opt,i)=>`<div class="option ${answers[q.id]===i?'selected':''}" data-i="${i}">${opt}</div>`).join('')}
      </div>
    `;
    document.querySelectorAll('.option').forEach(opt=>{
      opt.onclick = () => {
        answers[q.id] = parseInt(opt.dataset.i);
        saveState('quizData', {...quizData, answers, currentIndex});
        renderQuestion();
      }
    });
    resetQTimer();
  }

  function nextQuestion(auto=false){
    if(currentIndex < questions.length-1){
      currentIndex++;
      saveState('quizData', {...quizData, answers, currentIndex});
      renderQuestion();
    }else if(auto){
      submitQuiz('Per question timeout');
    }
  }
  function prevQuestion(){
    if(currentIndex > 0){
      currentIndex--;
      saveState('quizData', {...quizData, answers, currentIndex});
      renderQuestion();
    }
  }

  function submitQuiz(reason){
    clearInterval(globalTimer);
    clearInterval(qTimer);
    let marks = 0, totalMarks = 0;
    questions.forEach(q=>{
      totalMarks += q.marks || 1;
      if(answers[q.id] === q.correctIndex) marks += q.marks || 1;
    });
    const percentage = (marks/totalMarks)*100;
    const payload = {name, sid, topic, marks, totalMarks, percentage, reason, ts: Date.now()};
    saveState('resultData', payload);

    if(db){
      db.ref(`leaderboard/${topic}`).push(payload);
    }
    window.location.href = "result.html";
  }

  document.getElementById('nextBtn').onclick = ()=> nextQuestion();
  document.getElementById('prevBtn').onclick = ()=> prevQuestion();
  document.getElementById('submitBtn').onclick = ()=> submitQuiz('Manual submit');

  renderQuestion();
  updateGlobalTimer();
  startTimers();
}

/* -----------------------
   RESULT PAGE LOGIC
------------------------ */
const resultBox = document.getElementById('resultBox');
if(resultBox){
  const res = loadState('resultData');
  if(!res){ window.location.href = "start.html"; }
  // Calculate percentage for the pie chart
  const percentage = res.percentage.toFixed(2);
  const correctPercentage = parseFloat(percentage);
  const incorrectPercentage = 100 - correctPercentage;
  resultBox.innerHTML = `
    <div style="font-weight:800; color:var(--blue); text-align: center; margin-bottom: 20px;"></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div style="flex: 1;">
        <div style="margin-top:8px;"><strong>${res.name}</strong> (ID: ${res.sid})</div>
        <div class="small" style="margin-top:8px;">Submitted: ${new Date(res.ts).toLocaleString()}</div>
        <div class="small" style="margin-top:8px;">Reason: ${res.reason}</div>
      </div>
      <div style="flex: 0 0 120px; text-align: center;">
        <div style="width: 100px; height: 100px; border-radius: 50%; background: conic-gradient(var(--blue) 0% ${correctPercentage}%, var(--red) ${correctPercentage}% 100%); margin: 0 auto;"></div>
        <div style="margin-top: 10px; font-weight: bold;">${percentage}%</div>
        <div style="margin-top: 8px;">Marks: <strong>${res.marks}</strong> / ${res.totalMarks}</div>
      </div>
    </div>
  `;
}
