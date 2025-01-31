// main.js

// Google Apps Script のWebアプリURL
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby7keCGiQyahn-7UPM82EWjDEtYztgONfGkld3jWBl6YAzrDdmst0xHjBpRHK70NB_mDg/exec";

// sets.json の内容を保持する変数
let setsData = null;

// ページロード時に sets.json を読み込む
window.addEventListener('DOMContentLoaded', () => {
  fetch('config/sets.json')
    .then(response => response.json())
    .then(data => {
      setsData = data;
    })
    .catch(error => {
      console.error('Error loading sets.json:', error);
    });

  // 開始ボタンのリスナー
  document.getElementById('startSurveyBtn').addEventListener('click', startSurvey);
});

/**
 * アンケート開始ボタン押下時の処理
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

  // 入力セクションを非表示、質問セクションを表示
  document.getElementById('user-info-section').style.display = 'none';
  document.getElementById('survey-section').style.display = 'block';

  // 選択されたセットのquestionsを取得
  const questions = setsData[setNumber].questions;

  // 質問を描画
  const questionContainer = document.getElementById('question-container');
  questionContainer.innerHTML = ''; // 初期化

  questions.forEach((q) => {
    // question block
    const questionBlock = document.createElement('div');
    questionBlock.classList.add('question-block');

    // 見出し（質問番号など）
    const title = document.createElement('h3');
    title.textContent = `質問 ${q.questionIndex}`;
    questionBlock.appendChild(title);

    // 参照音声 (Ref)
    const refAudioPlayer = createAudioPlayer(q.refAudio, '参照音声');
    questionBlock.appendChild(refAudioPlayer);

    // 音声A (method1)
    const audioAPlayer = createAudioPlayer(q.method1Audio, '音声A');
    questionBlock.appendChild(audioAPlayer);

    // 音声B (method2)
    const audioBPlayer = createAudioPlayer(q.method2Audio, '音声B');
    questionBlock.appendChild(audioBPlayer);

    // ===============================
    // (1) どちらが自然に聞こえますか？
    // ===============================
    const naturalnessQ = document.createElement('p');
    naturalnessQ.textContent = 'どちらが自然に聞こえますか？';
    questionBlock.appendChild(naturalnessQ);

    const naturalnessChoices = document.createElement('div');
    // 4択のラジオボタン
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

    // ===============================
    // (2) どちらが参照音声の声を再現できていますか？
    // ===============================
    const reproductionQ = document.createElement('p');
    reproductionQ.textContent = 'どちらが参照音声の声を再現できていますか？';
    questionBlock.appendChild(reproductionQ);

    const reproductionChoices = document.createElement('div');
    // 4択のラジオボタン
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

    // 質問ブロックをコンテナに追加
    questionContainer.appendChild(questionBlock);
  });

  // 送信ボタンを表示
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.style.display = 'inline-block';
  submitBtn.onclick = () => submitAnswers(userName, setNumber, questions);
}

/**
 * ラジオボタンで選択されたセット番号を返す
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
 * オーディオプレーヤーを生成する
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
 * 回答送信処理
 */
function submitAnswers(userName, setNumber, questions) {
  // ユーザーが選択した回答をまとめる
  const answers = questions.map((q) => {
    const naturalnessValue = getRadioValue(`naturalness_${q.questionIndex}`);
    const reproductionValue = getRadioValue(`reproduction_${q.questionIndex}`);

    // 未回答チェック
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

  // 送信用のデータ
  const payload = {
    name: userName,
    setNumber: setNumber,
    answers: answers
  };

  // fetchでGoogle Apps Scriptに送信
  fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(response => response.json())
    .then(data => {
      console.log(data);
      // 成功したらアンケート画面非表示、完了画面を表示
      document.getElementById('survey-section').style.display = 'none';
      document.getElementById('result-section').style.display = 'block';
    })
    .catch(error => {
      console.error(error);
      alert('送信中にエラーが発生しました。');
    });
}

/**
 * 指定したname属性を持つラジオボタンのvalueを取得
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
