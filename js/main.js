// main.js

/**
 * ▼ Google Apps Script のWebアプリURL
 *   (「ウェブアプリとしてデプロイ」→アクセスできるユーザー: 「全員（匿名含む）」)
 */
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz8tVRP_jtxO2Wg0Naj6FWSKnmhi1QQWr1o8q6eM8gT_EjpIR6OhFQCrde4Bx7PKN29tA/exec";

// config/sets.json の内容を格納する変数
let setsData = null;

/**
 * ページ読み込み時
 */
window.addEventListener('DOMContentLoaded', () => {
  // 1. sets.json を取得して setsData に保存
  fetch('config/sets.json')
    .then(response => response.json())
    .then(data => {
      setsData = data;
    })
    .catch(error => {
      console.error('Error loading sets.json:', error);
    });

  // 2. アンケート開始ボタンのイベント
  document.getElementById('startSurveyBtn').addEventListener('click', startSurvey);
});

/**
 * アンケート開始
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

  // 入力セクションを隠して、質問セクションを表示
  document.getElementById('user-info-section').style.display = 'none';
  document.getElementById('survey-section').style.display = 'block';

  // 選択されたセットの questions を展開
  const questions = setsData[setNumber].questions;

  // 質問を表示していく
  const questionContainer = document.getElementById('question-container');
  questionContainer.innerHTML = ''; // 初期化

  questions.forEach((q) => {
    // 各質問ブロックを作成
    const questionBlock = document.createElement('div');
    questionBlock.classList.add('question-block');

    // タイトル (例: 質問 1)
    const title = document.createElement('h3');
    title.textContent = `質問 ${q.questionIndex}`;
    questionBlock.appendChild(title);

    // 参照音声
    questionBlock.appendChild(createAudioPlayer(q.refAudio, '参照音声'));

    // 音声A (method1)
    questionBlock.appendChild(createAudioPlayer(q.method1Audio, '音声A'));

    // 音声B (method2)
    questionBlock.appendChild(createAudioPlayer(q.method2Audio, '音声B'));

    // ------- (1) どちらが自然に聞こえますか？ -------
    const naturalnessTitle = document.createElement('p');
    naturalnessTitle.textContent = 'どちらが自然に聞こえますか？';
    questionBlock.appendChild(naturalnessTitle);

    const naturalnessChoices = document.createElement('div');
    naturalnessChoices.innerHTML = `
      <label>
        <input type="radio" name="naturalness_${q.questionIndex}" value="Aが好ましい">
        Aが好ましい
      </label>
      <label>
        <input type="radio" name="naturalness_${q.questionIndex}" value="どちらかと言えばAが好ましい">
        どちらかと言えばAが好ましい
      </label>
      <label>
        <input type="radio" name="naturalness_${q.questionIndex}" value="どちらかと言えばBが好ましい">
        どちらかと言えばBが好ましい
      </label>
      <label>
        <input type="radio" name="naturalness_${q.questionIndex}" value="Bが好ましい">
        Bが好ましい
      </label>
    `;
    questionBlock.appendChild(naturalnessChoices);

    // ------- (2) どちらが参照音声の声を再現できていますか？ -------
    const reproductionTitle = document.createElement('p');
    reproductionTitle.textContent = 'どちらが参照音声の声を再現できていますか？';
    questionBlock.appendChild(reproductionTitle);

    const reproductionChoices = document.createElement('div');
    reproductionChoices.innerHTML = `
      <label>
        <input type="radio" name="reproduction_${q.questionIndex}" value="Aが好ましい">
        Aが好ましい
      </label>
      <label>
        <input type="radio" name="reproduction_${q.questionIndex}" value="どちらかと言えばAが好ましい">
        どちらかと言えばAが好ましい
      </label>
      <label>
        <input type="radio" name="reproduction_${q.questionIndex}" value="どちらかと言えばBが好ましい">
        どちらかと言えばBが好ましい
      </label>
      <label>
        <input type="radio" name="reproduction_${q.questionIndex}" value="Bが好ましい">
        Bが好ましい
      </label>
    `;
    questionBlock.appendChild(reproductionChoices);

    // 質問ブロックをコンテナへ追加
    questionContainer.appendChild(questionBlock);
  });

  // 送信ボタンを表示
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.style.display = 'inline-block';
  submitBtn.onclick = () => submitAnswers(userName, setNumber, questions);
}

/**
 * ラジオボタンで選択されたセット番号を取得
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
 * オーディオプレイヤーを生成する
 */
function createAudioPlayer(src, labelText) {
  const container = document.createElement('div');
  const label = document.createElement('p');
  label.textContent = labelText;

  const audio = document.createElement('audio');
  audio.controls = true;
  audio.src = src;

  container.appendChild(label);
  container.appendChild(audio);
  return container;
}

/**
 * 回答送信 (FormData方式: CORS回避)
 */
function submitAnswers(userName, setNumber, questions) {
  // 1. 回答をまとめる
  const answers = questions.map((q) => {
    const naturalnessValue = getRadioValue(`naturalness_${q.questionIndex}`);
    const reproductionValue = getRadioValue(`reproduction_${q.questionIndex}`);

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

  // 2. 送信データをオブジェクト化 → JSON文字列に変換
  const dataObj = {
    name: userName,
    setNumber: setNumber,
    answers: answers
  };
  const jsonString = JSON.stringify(dataObj);

  // 3. FormDataを使って送信 (← 重要: CORSエラー回避)
  const formData = new FormData();
  // "payload" という名前で JSON文字列を格納
  formData.append("payload", jsonString);

  fetch(SCRIPT_URL, {
    method: 'POST',
    body: formData
  })
    .then(response => response.json())
    .then(data => {
      console.log("Response from GAS:", data);
      if (data.status === "success") {
        // 成功したら画面を切り替える
        document.getElementById('survey-section').style.display = 'none';
        document.getElementById('result-section').style.display = 'block';
      } else {
        alert("エラーが発生しました: " + data.message);
      }
    })
    .catch(error => {
      console.error(error);
      alert('送信中にエラーが発生しました。');
    });
}

/**
 * ラジオボタンの選択値を取得
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
