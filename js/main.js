// main.js

// ▼ Google Apps Script のWebアプリのURL (フォーム送信方式)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz8tVRP_jtxO2Wg0Naj6FWSKnmhi1QQWr1o8q6eM8gT_EjpIR6OhFQCrde4Bx7PKN29tA/exec";

// sets.json を読み込んだ内容を保持
let setsData = null;

// 現在の質問を表すインデックス (0-based)
let currentQuestionIndex = 0;

// 選択されたセットの質問リスト
let questions = [];

// 各問題の回答を保持する配列
// 例: answersState[i] = { naturalness: "Aが好ましい", reproduction: "Bが好ましい" }
let answersState = [];

/**
 * ページ読み込み時に sets.json を取得
 */
window.addEventListener('DOMContentLoaded', () => {
  fetch('config/sets.json')
    .then(response => response.json())
    .then(data => {
      setsData = data;
    })
    .catch(error => {
      console.error('Error loading sets.json:', error);
    });

  // ボタンイベントを登録
  document.getElementById('startSurveyBtn').addEventListener('click', startSurvey);
  document.getElementById('prevBtn').addEventListener('click', onPrev);
  document.getElementById('nextBtn').addEventListener('click', onNext);
  document.getElementById('submitBtn').addEventListener('click', onSubmit);
});

/**
 * 「アンケート開始」ボタン押下
 */
function startSurvey() {
  const userName = document.getElementById('userName').value.trim();
  if (!userName) {
    alert("名前を入力してください。");
    return;
  }

  const setNumber = getSelectedSetNumber();
  if (!setNumber) {
    alert("セット番号を選択してください。");
    return;
  }

  // 選択されたセットの questions を取り出し
  questions = setsData[setNumber].questions;

  // 回答状態を初期化（問題数だけ null を用意）
  answersState = questions.map(() => ({ naturalness: null, reproduction: null }));

  // 画面切り替え: ユーザー情報セクションを隠し、質問セクションを表示
  document.getElementById('user-info-section').style.display = 'none';
  document.getElementById('survey-section').style.display = 'block';

  // 最初の質問を表示
  currentQuestionIndex = 0;
  renderQuestion();
  updateNavButtons();
}

/**
 * ラジオボタンの名前を受け取り、選択された value を返す
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
 * 選択されたセット番号を取得 (user-info-section)
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
 * 現在の question を描画する
 */
function renderQuestion() {
  const questionContainer = document.getElementById('question-container');
  questionContainer.innerHTML = ""; // 一旦クリア

  const q = questions[currentQuestionIndex];
  // HTMLブロック生成
  const questionBlock = document.createElement('div');
  questionBlock.classList.add('question-block');

  // タイトル（例: 質問1）
  const title = document.createElement('h3');
  title.textContent = `質問 ${q.questionIndex}`;
  questionBlock.appendChild(title);

  // 参照音声
  questionBlock.appendChild(createAudioPlayer(q.refAudio, "参照音声"));
  // 音声A
  questionBlock.appendChild(createAudioPlayer(q.method1Audio, "音声A"));
  // 音声B
  questionBlock.appendChild(createAudioPlayer(q.method2Audio, "音声B"));

  // ------- 「どちらが自然に聞こえますか？」 -------
  const naturalnessTitle = document.createElement('p');
  naturalnessTitle.textContent = 'どちらが自然に聞こえますか？';
  questionBlock.appendChild(naturalnessTitle);

  // 4択 (改行して表示)
  const naturalnessChoices = document.createElement('div');
  naturalnessChoices.innerHTML = `
    <label style="display:block;"><input type="radio" name="naturalness" value="Aが好ましい">Aが好ましい</label>
    <label style="display:block;"><input type="radio" name="naturalness" value="どちらかと言えばAが好ましい">どちらかと言えばAが好ましい</label>
    <label style="display:block;"><input type="radio" name="naturalness" value="どちらかと言えばBが好ましい">どちらかと言えばBが好ましい</label>
    <label style="display:block;"><input type="radio" name="naturalness" value="Bが好ましい">Bが好ましい</label>
  `;
  questionBlock.appendChild(naturalnessChoices);

  // ------- 「どちらが参照音声を再現できていますか？」 -------
  const reproductionTitle = document.createElement('p');
  reproductionTitle.textContent = 'どちらが参照音声の声を再現できていますか？';
  questionBlock.appendChild(reproductionTitle);

  const reproductionChoices = document.createElement('div');
  reproductionChoices.innerHTML = `
    <label style="display:block;"><input type="radio" name="reproduction" value="Aが好ましい">Aが好ましい</label>
    <label style="display:block;"><input type="radio" name="reproduction" value="どちらかと言えばAが好ましい">どちらかと言えばAが好ましい</label>
    <label style="display:block;"><input type="radio" name="reproduction" value="どちらかと言えばBが好ましい">どちらかと言えばBが好ましい</label>
    <label style="display:block;"><input type="radio" name="reproduction" value="Bが好ましい">Bが好ましい</label>
  `;
  questionBlock.appendChild(reproductionChoices);

  questionContainer.appendChild(questionBlock);

  // 既に答えがあればラジオに反映
  const savedAnswer = answersState[currentQuestionIndex];
  if (savedAnswer) {
    if (savedAnswer.naturalness) {
      checkRadio("naturalness", savedAnswer.naturalness);
    }
    if (savedAnswer.reproduction) {
      checkRadio("reproduction", savedAnswer.reproduction);
    }
  }

  // ラジオボタンにイベントリスナーを付与し、
  // 変更されるたびに Next/Submit ボタンの活性/非活性を更新
  const radiosN = questionBlock.querySelectorAll('input[name="naturalness"]');
  const radiosR = questionBlock.querySelectorAll('input[name="reproduction"]');
  radiosN.forEach(r => r.addEventListener('change', onRadioChange));
  radiosR.forEach(r => r.addEventListener('change', onRadioChange));
}

/**
 * ラジオボタンをプログラム的にチェックする
 */
function checkRadio(nameVal, valueVal) {
  const radios = document.getElementsByName(nameVal);
  for (let i = 0; i < radios.length; i++) {
    if (radios[i].value === valueVal) {
      radios[i].checked = true;
      break;
    }
  }
}

/**
 * ラジオボタンが変更されたとき
 * → 回答を一時的に保存し、ボタンの活性/非活性を更新
 */
function onRadioChange() {
  saveCurrentAnswer(); // 選択状況を answersState に反映
  updateNavButtons();  // ボタンの enabled/disabled 切り替え
}

/**
 * 現在の問題の回答を answersState に保存
 */
function saveCurrentAnswer() {
  const nVal = getRadioValue('naturalness');
  const rVal = getRadioValue('reproduction');
  answersState[currentQuestionIndex].naturalness = nVal;
  answersState[currentQuestionIndex].reproduction = rVal;
}

/**
 * 現在の問題が回答済みかどうか
 */
function isCurrentQuestionAnswered() {
  const nVal = getRadioValue('naturalness');
  const rVal = getRadioValue('reproduction');
  // 両方選ばれていれば回答済み
  return (nVal && rVal);
}

/**
 * Prevボタン
 * → 前の問題へ移動
 */
function onPrev() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderQuestion();
    updateNavButtons();
  }
}

/**
 * Nextボタン
 * → 次の問題へ移動
 *   (押せる時点で回答済みなのでチェック不要)
 */
function onNext() {
  if (currentQuestionIndex < questions.length - 1) {
    currentQuestionIndex++;
    renderQuestion();
    updateNavButtons();
  }
}

/**
 * 送信ボタン
 */
function onSubmit() {
  // 最後の問題が未回答の場合、ここに来る前に無効化されている想定ですが、
  // 念のため再チェックしても良い。
  if (!isCurrentQuestionAnswered()) {
    alert("未回答です。");
    return;
  }
  saveCurrentAnswer();

  // 名前やセット番号を再取得
  const userName = document.getElementById('userName').value.trim();
  const setNumber = getSelectedSetNumber();

  // 送信データ
  const payloadObj = {
    name: userName,
    setNumber: setNumber,
    answers: questions.map((q, i) => {
      return {
        questionIndex: q.questionIndex,
        naturalness: answersState[i].naturalness,
        reproduction: answersState[i].reproduction
      };
    })
  };

  const jsonString = JSON.stringify(payloadObj);

  // FormData で送る (CORS を回避)
  const formData = new FormData();
  formData.append("payload", jsonString);

  fetch(SCRIPT_URL, {
    method: 'POST',
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      console.log("Response from GAS:", data);
      if (data.status === "success") {
        // 成功したら画面を切り替え
        document.getElementById('survey-section').style.display = 'none';
        document.getElementById('result-section').style.display = 'block';
      } else {
        alert("エラー: " + data.message);
      }
    })
    .catch(err => {
      console.error(err);
      alert("送信中にエラーが発生しました。");
    });
}

/**
 * ボタンの表示・非表示、enabled/disabled を切り替える
 */
function updateNavButtons() {
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');

  // 一番最初の問題なら prev を隠す
  if (currentQuestionIndex === 0) {
    prevBtn.style.display = 'none';
  } else {
    prevBtn.style.display = 'inline-block';
  }

  // 最終問題かどうか
  if (currentQuestionIndex === questions.length - 1) {
    // 最終問題 → nextBtn を隠して submitBtn を表示
    nextBtn.style.display = 'none';
    submitBtn.style.display = 'inline-block';
  } else {
    // それ以外 → nextBtn を表示して submitBtn は隠す
    nextBtn.style.display = 'inline-block';
    submitBtn.style.display = 'none';
  }

  // --- 次に進む/送信ボタンの有効・無効を制御 ---
  // 「Prev」ボタンは常に押せるようにするが、仕様によっては最初以外は常に押せる想定
  // Next or Submit ボタンは現在の問題が回答済みかどうかで決定
  const answered = isCurrentQuestionAnswered();

  if (currentQuestionIndex < questions.length - 1) {
    // 中間問題の Next
    nextBtn.disabled = !answered;
  } else {
    // 最終問題の Submit
    submitBtn.disabled = !answered;
  }
}

/**
 * 音声プレイヤーを作成するユーティリティ
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
