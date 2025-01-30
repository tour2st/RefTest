// main.js

// ▼ Google Apps ScriptのデプロイURLをここに設定
const SCRIPT_URL = "https://script.google.com/macros/s/xxxxxxxxxxxxxxxx/exec";

// セットごとのデータを保持する変数
let setsData = null;

// ページが読み込まれたタイミングで sets.json を取得
window.addEventListener('DOMContentLoaded', () => {
  fetch('config/sets.json')
    .then(response => response.json())
    .then(data => {
      setsData = data;
    })
    .catch(error => {
      console.error('Error loading sets.json:', error);
    });

  // 開始ボタンのイベントリスナー
  document.getElementById('startSurveyBtn').addEventListener('click', startSurvey);
});

/**
 * アンケート開始ボタンを押したときの処理
 */
function startSurvey() {
  const userName = document.getElementById('userName').value.trim();
  if (!userName) {
    alert('名前を入力してください。');
    return;
  }

  const setNumber = getSelectedSetNumber();
  if (!setNumber) {
    alert('セット番号を選択してください。');
    return;
  }

  // ユーザー入力セクションを非表示にし、質問セクションを表示
  document.getElementById('user-info-section').style.display = 'none';
  document.getElementById('survey-section').style.display = 'block';

  // 選択されたセットの問題データを取り出す
  const questions = setsData[setNumber].questions;

  // 質問を表示
  const questionContainer = document.getElementById('question-container');
  questionContainer.innerHTML = ''; // 一旦クリア

  questions.forEach((q) => {
    // q は {questionIndex, refAudio, method1Audio, method2Audio} を持つ
    const questionBlock = document.createElement('div');
    questionBlock.classList.add('question-block');

    // 質問タイトル
    const title = document.createElement('h3');
    title.textContent = `質問 ${q.questionIndex}`;
    questionBlock.appendChild(title);

    // 参照音声 (Ref)
    const refAudioPlayer = createAudioPlayer(q.refAudio, '参照音声');
    questionBlock.appendChild(refAudioPlayer);

    // メソッド1音声
    const m1AudioPlayer = createAudioPlayer(q.method1Audio, 'メソッド1');
    questionBlock.appendChild(m1AudioPlayer);

    // メソッド2音声
    const m2AudioPlayer = createAudioPlayer(q.method2Audio, 'メソッド2');
    questionBlock.appendChild(m2AudioPlayer);

    // 「どちらが自然に聞こえますか？」のラジオボタン
    const naturalnessQ = document.createElement('p');
    naturalnessQ.textContent = 'どちらが自然に聞こえますか？';
    questionBlock.appendChild(naturalnessQ);
    const naturalnessChoices = document.createElement('div');
    naturalnessChoices.innerHTML = `
      <label><input type="radio" name="naturalness_${q.questionIndex}" value="method1">メソッド1</label>
      <label><input type="radio" name="naturalness_${q.questionIndex}" value="method2">メソッド2</label>
    `;
    questionBlock.appendChild(naturalnessChoices);

    // 「どちらが参照音声を再現できていますか？」のラジオボタン
    const reproductionQ = document.createElement('p');
    reproductionQ.textContent = 'どちらが参照音声の声を再現できていますか？';
    questionBlock.appendChild(reproductionQ);
    const reproductionChoices = document.createElement('div');
    reproductionChoices.innerHTML = `
      <label><input type="radio" name="reproduction_${q.questionIndex}" value="method1">メソッド1</label>
      <label><input type="radio" name="reproduction_${q.questionIndex}" value="method2">メソッド2</label>
    `;
    questionBlock.appendChild(reproductionChoices);

    // questionBlock をコンテナに追加
    questionContainer.appendChild(questionBlock);
  });

  // 送信ボタンを表示
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.style.display = 'inline-block';
  submitBtn.onclick = () => submitAnswers(userName, setNumber, questions);
}

/**
 * 選択されたセット番号を取得するユーティリティ関数
 */
function getSelectedSetNumber() {
  const radios = document.getElementsByName('setNumber');
  for (let i = 0; i < radios.length; i++) {
    if (radios[i].checked) {
      return radios[i].value;
    }
  }
  return null;
}

/**
 * オーディオプレイヤーを生成するユーティリティ関数
 */
function createAudioPlayer(audioSrc, labelText) {
  const container = document.createElement('div');
  const label = document.createElement('p');
  label.textContent = labelText;
  const audio = document.createElement('audio');
  audio.controls = true;
  audio.src = audioSrc;

  container.appendChild(label);
  container.appendChild(audio);
  return container;
}

/**
 * 回答送信処理
 */
function submitAnswers(userName, setNumber, questions) {
  // 質問ごとの回答を集計
  const answers = questions.map(q => {
    const naturalnessValue = getRadioValue(`naturalness_${q.questionIndex}`);
    const reproductionValue = getRadioValue(`reproduction_${q.questionIndex}`);

    // 未回答の場合はエラーを投げるか、アラートを出す
    if (!naturalnessValue || !reproductionValue) {
      alert(`質問 ${q.questionIndex} が未回答です。`);
      throw new Error(`Question ${q.questionIndex} is incomplete`);
    }

    return {
      questionIndex: q.questionIndex,
      naturalness: naturalnessValue,
      reproduction: reproductionValue
    };
  });

  // まとめたデータを Apps Script へ送信
  const payload = {
    name: userName,
    setNumber: setNumber,
    answers: answers
  };

  fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(response => response.json())
    .then(data => {
      console.log(data);
      // 成功したらアンケート画面を隠して終了メッセージを表示
      document.getElementById('survey-section').style.display = 'none';
      document.getElementById('result-section').style.display = 'block';
    })
    .catch(error => {
      console.error(error);
      alert('送信中にエラーが発生しました。');
    });
}

/**
 * ラジオボタンの選択値を取得するユーティリティ関数
 */
function getRadioValue(name) {
  const radios = document.getElementsByName(name);
  for (let i = 0; i < radios.length; i++) {
    if (radios[i].checked) {
      return radios[i].value;
    }
  }
  return null;
}
