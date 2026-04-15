document.addEventListener('DOMContentLoaded', () => {
    // State Management
    let examBank = [];
    let currentChapter = null;
    let currentQuestions = [];
    let currentIndex = 0;
    let answers = []; // [{ selected: "أ", correct: true }]
    let isReviewMode = false;

    // DOM Elements
    const startScreen = document.getElementById('start-screen');
    const quizScreen = document.getElementById('quiz-screen');
    const resultScreen = document.getElementById('result-screen');
    const chaptersList = document.getElementById('chapters-list');
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const feedbackContainer = document.getElementById('feedback-container');
    const correctAnswerText = document.getElementById('correct-answer-text');
    const currentQNum = document.getElementById('current-q-num');
    const totalQNum = document.getElementById('total-q-num');
    const currentChapterTitle = document.getElementById('current-chapter-title');
    const questionNav = document.getElementById('question-nav');
    const sidebar = document.getElementById('sidebar');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const restartBtn = document.getElementById('restart-btn');
    const reviewWrongBtn = document.getElementById('review-wrong-btn');
    const totalCorrectEl = document.getElementById('total-correct');
    const totalWrongEl = document.getElementById('total-wrong');
    const percentageEl = document.getElementById('percentage');

    // Initialize App
    async function init() {
        try {
            const response = await fetch('data.json');
            const data = await response.json();
            examBank = data.exam_bank;
            renderChapters();
            checkSavedProgress();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    function renderChapters() {
        chaptersList.innerHTML = '';
        examBank.forEach((chapter, index) => {
            const btn = document.createElement('button');
            btn.className = 'chapter-btn';
            btn.textContent = chapter.chapter;
            btn.addEventListener('click', () => startQuiz(index));
            chaptersList.appendChild(btn);
        });
    }

    function startQuiz(chapterIndex, savedState = null) {
        currentChapter = examBank[chapterIndex];
        currentQuestions = currentChapter.questions;
        currentChapterTitle.textContent = currentChapter.chapter;
        
        if (savedState) {
            currentIndex = savedState.currentIndex;
            answers = savedState.answers;
        } else {
            currentIndex = 0;
            answers = new Array(currentQuestions.length).fill(null);
        }

        isReviewMode = false;
        showScreen(quizScreen);
        renderQuestion();
        renderSidebar();
        saveProgress();
    }

    function showScreen(screen) {
        [startScreen, quizScreen, resultScreen].forEach(s => s.classList.remove('active'));
        screen.classList.add('active');
    }

    function renderQuestion() {
        const question = currentQuestions[currentIndex];
        questionText.textContent = question.text;
        currentQNum.textContent = currentIndex + 1;
        totalQNum.textContent = currentQuestions.length;

        optionsContainer.innerHTML = '';
        feedbackContainer.classList.add('hidden');

        const options = Object.entries(question.options);
        const savedAnswer = answers[currentIndex];

        options.forEach(([key, value]) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerHTML = `<span class="option-key">${key}:</span> <span class="option-val">${value}</span>`;
            
            if (savedAnswer) {
                btn.disabled = true;
                if (key === question.correct_answer) {
                    btn.classList.add('correct');
                }
                if (savedAnswer.selected === key && !savedAnswer.correct) {
                    btn.classList.add('wrong');
                }
            } else {
                btn.addEventListener('click', () => handleAnswer(key));
            }
            optionsContainer.appendChild(btn);
        });

        if (savedAnswer) {
            showFeedback(question);
        }

        updateNavButtons();
        updateSidebarHighlight();
    }

    function handleAnswer(selectedKey) {
        const question = currentQuestions[currentIndex];
        const isCorrect = selectedKey === question.correct_answer;
        
        answers[currentIndex] = {
            selected: selectedKey,
            correct: isCorrect
        };

        renderQuestion();
        renderSidebar();
        saveProgress();

        // Auto-advance after a short delay if not the last question
        if (currentIndex === currentQuestions.length - 1) {
            setTimeout(showResults, 1000);
        }
    }

    function showFeedback(question) {
        feedbackContainer.classList.remove('hidden');
        correctAnswerText.innerHTML = `الإجابة الصحيحة هي: <strong>${question.correct_answer} - ${question.options[question.correct_answer]}</strong>`;
    }

    function renderSidebar() {
        questionNav.innerHTML = '';
        currentQuestions.forEach((_, index) => {
            const div = document.createElement('div');
            div.className = 'nav-num';
            div.textContent = index + 1;
            
            const answer = answers[index];
            if (answer) {
                div.classList.add(answer.correct ? 'correct' : 'wrong');
            } else {
                div.classList.add('unanswered');
            }

            if (index === currentIndex) div.classList.add('current');

            div.addEventListener('click', () => {
                currentIndex = index;
                renderQuestion();
            });
            questionNav.appendChild(div);
        });
    }

    function updateSidebarHighlight() {
        const navNums = questionNav.querySelectorAll('.nav-num');
        navNums.forEach((nav, index) => {
            nav.classList.toggle('current', index === currentIndex);
        });
    }

    function updateNavButtons() {
        prevBtn.disabled = currentIndex === 0;
        nextBtn.textContent = currentIndex === currentQuestions.length - 1 ? 'إنهاء' : 'التالي';
    }

    function showResults() {
        const correctCount = answers.filter(a => a && a.correct).length;
        const wrongCount = answers.filter(a => a && !a.correct).length;
        const total = currentQuestions.length;
        const percentage = Math.round((correctCount / total) * 100);

        totalCorrectEl.textContent = correctCount;
        totalWrongEl.textContent = wrongCount;
        percentageEl.textContent = `${percentage}%`;

        showScreen(resultScreen);
        localStorage.removeItem('quiz_progress'); // Clear progress on finish
    }

    function startReviewMode() {
        const wrongIndices = answers.map((a, i) => (a && !a.correct) ? i : -1).filter(i => i !== -1);
        if (wrongIndices.length === 0) {
            alert('لا توجد أخطاء لمراجعتها!');
            return;
        }
        
        // Filter questions to only wrong ones
        const originalQuestions = [...currentQuestions];
        const originalAnswers = [...answers];
        
        currentQuestions = wrongIndices.map(i => originalQuestions[i]);
        answers = wrongIndices.map(i => originalAnswers[i]);
        
        currentIndex = 0;
        isReviewMode = true;
        showScreen(quizScreen);
        renderQuestion();
        renderSidebar();
    }

    // Navigation Events
    nextBtn.addEventListener('click', () => {
        if (currentIndex < currentQuestions.length - 1) {
            currentIndex++;
            renderQuestion();
            saveProgress();
        } else {
            showResults();
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            renderQuestion();
            saveProgress();
        }
    });

    toggleSidebarBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });

    restartBtn.addEventListener('click', () => {
        showScreen(startScreen);
        localStorage.removeItem('quiz_progress');
    });

    reviewWrongBtn.addEventListener('click', startReviewMode);

    // LocalStorage Persistence
    function saveProgress() {
        if (isReviewMode) return; // Don't save review mode state
        const progress = {
            chapterTitle: currentChapter.chapter,
            chapterIndex: examBank.findIndex(c => c.chapter === currentChapter.chapter),
            currentIndex,
            answers
        };
        localStorage.setItem('quiz_progress', JSON.stringify(progress));
    }

    function checkSavedProgress() {
        const saved = localStorage.getItem('quiz_progress');
        if (saved) {
            const progress = JSON.parse(saved);
            if (confirm(`هل تريد استكمال التقدم في "${progress.chapterTitle}"؟`)) {
                startQuiz(progress.chapterIndex, progress);
            } else {
                localStorage.removeItem('quiz_progress');
            }
        }
    }

    init();
});
