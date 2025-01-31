// main.js

// --- Google Apps ScriptのURL ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxBmOtMf29n5hPgom-SXsV6cOyk-nkmLZxAxCFxTTk8pE3FJFiurByDci0nCVqYSt7nqA/exec";

// 質問リスト (例:2問)
const questionData = [
  {
    questionIndex: 1,
    naturalnessLabel: "どちらが自然に聞こえますか？",
    reproductionLabel: "どちらが参照音声を再現できていますか？"
  },
  {
    questionIndex: 2,
    naturalnessLabel: "どちらが自然に聞こえますか？ (Q2)",
    reproductionLabel: "どちらが参照音声を再現できていますか？ (Q2)"
  }
];

// 現在何番目の問題を表示中か (0-based)
let currentQuestionIndex = 0;

// 回答配列: answersState[i] = { questionIndex, naturalness, reproduction }
let answersState = [];

window.addEventListener('DOMContentLoaded', () => {
  // ボタンイベント設定
  document.getElementById('startSurveyBtn').addEventListener('click', startSurvey);
  document.getElementById('prevBtn').addEventListener('click', onPrev);
  document.getElementById('nextBtn').addEventListener('click', onNext);
  document.getElementById('resendBtn').addEventListener('click', onResend);
});

/**
 * 「アンケート開始」ボタン
 */
function startSurvey() {
  const userName = document.getElementById('userName').value.trim();
  if (!userName) {
    alert("名前を入力してください。");
    return;
  }

  const setNumber = getRadioValue('setNumber');
  if (!setNumber) {
    alert("セット番号を選択してください。");
    return;
  }

  // 回答配列を初期化 (questionDataの問題数だけ枠を作る)
  answersState = questionData.map(q => ({
    questionIndex: q.questionIndex,
    naturalness: null,
    reproduction: null
  }));

  // 入力画面を隠し、1問目の画面へ
  document.getElementById('user-info-section').style.display = 'none';
  document.getElementById('survey-section').style.display = 'block';

  currentQuestionIndex = 0;
  renderQuestion();
  updateNavButtons();
}

/**
 * 現在の質問を画面に描画
 */
function renderQuestion() {
  const questionContainer = document.getElementById('question-container');
  questionContainer.innerHTML = "";

  const q = questionData[currentQuestionIndex];
  // questionIndex, naturalnessLabel, reproductionLabel

  const questionBlock = document.createElement('div');

  // タイトル
  const title = document.createElement('h3');
  title.textContent = `質問 ${q.questionIndex}`;
  questionBlock.appendChild(title);

  // ------ 自然さ ------
  const nLabel = document.createElement('p');
  nLabel.textContent = q.naturalnessLabel;
  questionBlock.appendChild(nLabel);

  // 1行ずつ表示(1~4)
  const nChoice = document.createElement('div');
  nChoice.innerHTML = `
    <label style="display:block;"><input type="radio" name="naturalness" value="1">1</label>
    <label style="display:block;"><input type="radio" name="naturalness" value="2">2</label>
    <label style="display:block;"><input type="radio" name="naturalness" value="3">3</label>
    <label style="display:block;"><input type="radio" name="naturalness" value="4">4</label>
  `;
  questionBlock.appendChild(nChoice);

  // ------ 再現度 ------
  const rLabel = document.createElement('p');
  rLabel.textContent = q.reproductionLabel;
  questionBlock.appendChild(rLabel);

  const rChoice = document.createElement('div');
  rChoice.innerHTML = `
    <label style="display:block;"><input type="radio" name="reproduction" value="1">1</label>
    <label style="display:block;"><input type="radio" name="reproduction" value="2">2</label>
    <label style="display:block;"><input type="radio" name="reproduction" value="3">3</label>
    <label style="display:block;"><input type="radio" name="reproduction" value="4">4</label>
  `;
  questionBlock.appendChild(rChoice);

  questionContainer.appendChild(questionBlock);

  // もし既に answersState に回答が入っていれば、ラジオを復元
  const saved = answersState[currentQuestionIndex];
  if (saved) {
    checkRadio('naturalness', saved.naturalness);
    checkRadio('reproduction', saved.reproduction);
  }
}

/**
 * ラジオボタンをプログラム的にチェック
 */
function checkRadio(nameVal, valueVal) {
  if (!valueVal) return;
  const radios = document.getElementsByName(nameVal);
  for (let i = 0; i < radios.length; i++) {
    if (radios[i].value === valueVal) {
      radios[i].checked = true;
      break;
    }
  }
}

/**
 * Prevボタン
 */
function onPrev() {
  // 現在の回答を保存
  if (!saveCurrentAnswer()) {
    // 未回答なら一応保存はできないが、Prevは許容すると想定
    // 仕様に応じて、未回答なら戻れないなど制御してもOK
  }

  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderQuestion();
    updateNavButtons();
  }
}

/**
 * Nextボタン
 */
function onNext() {
  // 未回答チェック
  if (!saveCurrentAnswer()) {
    alert("未回答です。");
    return;
  }

  // 最終問題なら送信へ
  if (currentQuestionIndex === questionData.length - 1) {
    // 送信処理
    goSendingPage();
  } else {
    // 次の問題へ
    currentQuestionIndex++;
    renderQuestion();
    updateNavButtons();
  }
}

/**
 * 現在の問題の回答を answersState に保存
 * 未回答があれば false を返す
 */
function saveCurrentAnswer() {
  const nVal = getRadioValue('naturalness');
  const rVal = getRadioValue('reproduction');
  if (!nVal || !rVal) {
    return false;
  }
  answersState[currentQuestionIndex].naturalness = nVal;
  answersState[currentQuestionIndex].reproduction = rVal;
  return true;
}

/**
 * 指定したname属性をもつラジオボタンの選択値を返す
 */
function getRadioValue(nameVal) {
  const radios = document.getElementsByName(nameVal);
  for (let i = 0; i < radios.length; i++) {
    if (radios[i].checked) {
      return radios[i].value;
    }
  }
  return null;
}

/**
 * Prev/Nextボタンの表示制御
 */
function updateNavButtons() {
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  if (currentQuestionIndex === 0) {
    // 最初の問題なら Prev を隠す
    prevBtn.style.display = 'none';
  } else {
    prevBtn.style.display = 'inline-block';
  }

  if (currentQuestionIndex === questionData.length - 1) {
    // 最後の問題なら Next ボタンにラベルを変えるなど
    nextBtn.textContent = 'Submit';  // 送信
  } else {
    nextBtn.textContent = 'Next';
  }
}

/**
 * 全回答が完了 → 「送信中...」画面へ
 */
function goSendingPage() {
  // survey-section を隠す
  document.getElementById('survey-section').style.display = 'none';
  // sending-section を表示
  document.getElementById('sending-section').style.display = 'block';

  // 実際の送信
  sendAnswers();
}

/**
 * 回答を送信 (fetch)
 */
function sendAnswers() {
  // 名前やセット番号を再度取得
  const userName = document.getElementById('userName').value.trim();
  const setNumber = getRadioValue('setNumber');

  // payload
  const payloadObj = {
    name: userName,
    setNumber: setNumber,
    answers: answersState
  };

  // 再送信用にグローバル変数に保存
  window.lastPayload = payloadObj;

  // FormDataで送信 (CORS回避)
  const formData = new FormData();
  formData.append('payload', JSON.stringify(payloadObj));

  fetch(SCRIPT_URL, {
    method: 'POST',
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      if (data.status === "success") {
        // 送信完了画面へ
        document.getElementById('sending-section').style.display = 'none';
        document.getElementById('result-section').style.display = 'block';
      } else {
        alert("サーバーエラー: " + data.message);
      }
    })
    .catch(err => {
      console.error(err);
      alert("送信に失敗しました。再送信を試してください。");
    });
}

/**
 * 「再送信」ボタンが押された時
 */
function onResend() {
  if (window.lastPayload) {
    // 同じデータを再送する
    const formData = new FormData();
    formData.append('payload', JSON.stringify(window.lastPayload));

    fetch(SCRIPT_URL, {
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === "success") {
          // 成功したら完了画面へ
          document.getElementById('sending-section').style.display = 'none';
          document.getElementById('result-section').style.display = 'block';
        } else {
          alert("サーバーエラー: " + data.message);
        }
      })
      .catch(err => {
        console.error(err);
        alert("再送信にも失敗しました。");
      });
  } else {
    alert("再送信データがありません。");
  }
}
