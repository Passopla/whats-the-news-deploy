import StartScene from './start.js';
import CategorySelectScene from './selection.js';
import { CATEGORIES } from './selection.js';
import { isPortrait, sizeForScreen, fitButtonWidth } from './layout.js';

// Where everything sits on the game screen, per canvas shape (see layout.js).
// Answers stay in two columns in both, so portrait feels like the landscape game.
const GAME_LAYOUTS =
{
  landscape:
  {
    title: { x: 50, y: 20, size: 24, originX: 0 },
    statFont: 20,
    counter: { x: 400, y: 20 },
    score: { x: 650, y: 20 },
    lives: { x: 650, y: 50, originX: 0 },
    category: { y: 65, size: 22 },
    headline: { x: 50, y: 100, size: 22, wrap: 700 },
    options: { columns: [230, 570], width: 300, startY: 190, spacingY: 50, size: 22, padY: 8 },
    result: { y: 462, size: 24 },
    next: { y: 512, size: 24, padX: 28, padY: 8 },
    back: { y: 568, size: 18, padX: 14, padY: 6 },
    message: { size: 24, endSize: 44 }
  },
  portrait:
  {
    title: { x: 300, y: 30, size: 36, originX: 0.5 },
    statFont: 26,
    counter: { x: 300, y: 95 },
    score: { x: 30, y: 95 },
    lives: { x: 570, y: 95, originX: 1 },
    category: { y: 150, size: 28 },
    headline: { x: 40, y: 215, size: 34, wrap: 520 },
    options: { columns: [155, 445], width: 270, startY: 520, spacingY: 76, size: 30, padY: 12 },
    result: { y: 940, size: 30 },
    next: { y: 1030, size: 34, padX: 44, padY: 14 },
    back: { y: 1130, size: 26, padX: 20, padY: 12 },
    message: { size: 32, endSize: 56 }
  }
};

const UI_STYLES = 
{
  title: 
  { 
      fontFamily: 'Arial', 
      fontSize: '24px', 
      fill: '#ffffff', 
      fontStyle: 'bold' 
  },
  counter: 
  { 
      fontFamily: 'Arial', 
      fontSize: '20px', 
      fill: '#ffffff', 
      fontStyle: 'bold' 
  },
  score: 
  { 
      fontFamily: 'Arial', 
      fontSize: '20px', 
      fill: '#00ff00', 
      fontStyle: 'normal' 
  },
  lives: 
  { 
      fontFamily: 'Arial', 
      fontSize: '20px', 
      fill: '#ff4d4d', 
      fontStyle: 'normal' 
  },
  headline: 
  { 
      fontFamily: 'Georgia', 
      fontSize: '20px', 
      fill: '#ffffff',
      wordWrap: 
      {
        width: 700 
      }
  },
  backButton: 
  {
    fontFamily: 'Arial',
    fontSize: '16px',
    fill: '#cccccc', // lighter grey text
    backgroundColor: '#444444', // dark grey background
    padding:
      { 
        left: 10,
        right: 10,
        top: 5,
        bottom: 5 
      }
  },
  categoryTitle:
  {
    fontFamily: 'Georgia',
    fontSize: '22px',
    fill: '#aaaaaa', // A nice subtle grey
    fontStyle: 'italic'
  },
  hyperlink: 
  {
    fontFamily: 'Arial',
    fontSize: '12px',
    fill: '#4d94ff', // Link blue
    underline: 
    {
        color: '#4d94ff',
        thickness: 1
    }
}
};

const analyzeWord = (rawWord) => 
    {
        if (!rawWord) return{ tag: 'Noun', word: '' };
        const word = rawWord.toLowerCase().replace(/[.,'":;()‘’“”]/g, '');
        if (!word) return { tag: 'Noun', word: '' };
        const doc = nlp(word);
        const priorityTags = ['Plural', 'Possessive', 'PastTense', 'PresentTense', 'Infinitive', 'Comparative', 'Superlative'];
        let tag = priorityTags.find(t => doc.has(`#${t}`)) || 'Noun';
        if (tag === 'Noun')
        {
            if (doc.has('#Verb')) tag = 'Verb';
            else if (doc.has('#Adjective')) tag = 'Adjective';
        }
        return { tag, word };
    };

const getSemanticallySimilarWords = async (word, count = 3) => 
    {
        try 
        {
            const response = await fetch(`https://api.datamuse.com/words?rel_trg=${word}&max=10`);
            const data = await response.json();
            return data.filter(item => !item.word.includes(' ')).slice(0, count).map(item => item.word);
        } 
        catch (error) 
        {
            return [];
        }
    };

class NewsGame extends Phaser.Scene 
    {
            constructor() 
                {
                    super("NewsGame");
                }

            init(data)
                {

                    this.selectedCategory = data && data.categoryKey ? data.categoryKey : 'general'; 

                    // Find the full category object from the imported array.
                    const categoryObject = CATEGORIES.find(cat => cat.key === this.selectedCategory);
                    // Store the label for the UI. Provide a fallback just in case.
                    this.selectedCategoryLabel = categoryObject ? categoryObject.label : 'General Mix';

                    this.score = this.registry.get('sessionScore');
                    this.incorrectAnswers = 3 - this.registry.get('sessionLives')
                    this.totalIncorrectAllowed = 3;

                    this.livesText = null;

                    this.articles = [];
                    this.currentArticleIndex = -1;
                    this.questionObjects = [];
                    this.wordPoolByTag = {};
                    this.aiQuestions = {};
                    this.totalArticles = 0;
                    this.answered = false;
                    this.endMessage = null;

                    // Set when the screen rotates mid-game, so the scene can redraw without refetching.
                    this.resumeState = data && data.resume ? data.resume : null;
                }

            // Called on rotation: restart in the new layout, keeping articles and progress.
            relayout()
                {
                    if (this.articles.length === 0)
                        {
                            this.scene.restart({ categoryKey: this.selectedCategory });
                            return;
                        }

                    this.scene.restart(
                        {
                            categoryKey: this.selectedCategory,
                            resume:
                                {
                                    articles: this.articles,
                                    aiQuestions: this.aiQuestions,
                                    wordPoolByTag: this.wordPoolByTag,
                                    // An unanswered question is shown again; an answered one moves on.
                                    nextIndex: this.answered ? this.currentArticleIndex : this.currentArticleIndex - 1,
                                    endMessage: this.endMessage
                                }
                        });
                }

            resumeFrom(state)
                {
                    this.articles = state.articles;
                    this.aiQuestions = state.aiQuestions;
                    this.wordPoolByTag = state.wordPoolByTag;
                    this.totalArticles = state.articles.length;

                    if (state.endMessage)
                        {
                            this.showEndGameMessage(state.endMessage);
                            return;
                        }

                    this.currentArticleIndex = state.nextIndex;
                    this.displayNextQuestion();
                }


            updateLivesUI_Text() 
            {
                // constant variable, stored in the registry.
                const currentLives = this.registry.get('sessionLives');
                
                // If the text object doesn't exist yet, create it.
                if (!this.livesText) 
                    {
                        const { lives } = this.L;
                        this.livesText = this.add.text(lives.x, lives.y, `Lives: ${currentLives}`, { ...UI_STYLES.lives, fontSize: `${this.L.statFont}px` })
                            .setOrigin(lives.originX, 0);
                    } else 
                        {
                            // Otherwise, if it already exists, just update its text.
                            this.livesText.setText(`Lives: ${currentLives}`);
                        }
            }
            // IMAGE-BASED LIVES (Sprites)
            // createLivesUI_ImageExample() 
            // {
            //     this.livesImages = []; // Array to hold heart images
            //     const startX = 750;
            //     const spacing = 40;
            //     for (let i = 0; i < this.totalIncorrectAllowed; i++) 
            //         {
            //             // Create hearts from right to left
            //             const heart = this.add.image(startX - (i * spacing), 60, 'heart').setOrigin(0.5);
            //             this.livesImages.push(heart);
            //         }
            // }

            // updateLivesUI_ImageExample() 
            // {
            //     // Hide hearts when answer wrong
            //     this.livesImages.forEach((heart, index) => {
            //         // The first incorrect answer hides the first heart, ++.
            //         const shouldBeVisible = index < (this.totalIncorrectAllowed - this.incorrectAnswers);
            //         heart.setVisible(shouldBeVisible);
            //     });
            // }

            // GENERAL UPDATE FUNCTIONS
            updateScoreText() 
                {
                    this.scoreText.setText(`Score: ${this.score}`);
                }

            updateQuestionCounterText() 
                {
                    const questionsAnswered = this.registry.get('sessionQuestionsAnswered');
                    const totalGoal = 50; // Player session goal
                    // Uses the global count, not the local article index (registry)
                    this.questionCounterText.setText(`Question: ${questionsAnswered} / ${totalGoal}`);
                }

            create() 
                {
                    // New object on every (re)start, so results from a fetch started
                    // before a rotation can tell they are stale and be ignored.
                    this.runId = {};
                    this.L = isPortrait(this) ? GAME_LAYOUTS.portrait : GAME_LAYOUTS.landscape;

                    this.setupUI(); // Function to create all UI elements.

                    if (this.resumeState)
                        {
                            this.resumeFrom(this.resumeState);
                            return;
                        }

                    const loadingText = this.add.text(this.scale.width / 2, this.scale.height / 2, "Loading headlines...",
                        {
                            fontSize: `${this.L.message.size}px`,
                            fill: "#fff"
                        }).setOrigin(0.5);

                    this.fetchArticlesAndStart(loadingText);
                }

            async fetchArticlesAndStart(loadingText)
                {
                    const runId = this.runId;
                    const serverUrl = `https://whats-the-news-deploy.vercel.app/api/news?category=${this.selectedCategory}`;
                    console.log(`Fetching from category: ${this.selectedCategory}`);

                    try 
                        {
                            const response = await fetch(serverUrl);
                            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                
                            const data = await response.json();
                            if (this.runId !== runId) return; // Scene restarted (rotation) while loading.

                            if (data.response && data.response.status === "ok" && data.response.results) 
                                {
                                    this.articles = data.response.results.filter(a => a.webTitle && a.webTitle.length > 30);
                                    // AI-picked blanks + wrong options, keyed by article id. Missing when the AI is unavailable.
                                    this.aiQuestions = data.questions || {};

                                    // Check if the filtered list of articles is empty.
                                    if (this.articles.length === 0) 
                                        {
                                            loadingText.setText('No articles found for this category.\nPlease choose another.');
                                            
                                            // Add a delay so the player can read the message, then go back to menu.
                                            this.time.delayedCall(3000, () =>
                                                {
                                                    this.scene.start("CategorySelectScene");
                                                });
                                            return;
                                        }

                                    // If we have articles, continue as normal.
                                    this.articles.sort(() => Math.random() - 0.5);
                                    this.totalArticles = this.articles.length;
                    
                                    loadingText.setText("Analyzing headlines...");
                                    this.buildWordPool();
                                    loadingText.destroy();
                                    this.displayNextQuestion();
                                } else 
                            {
                                loadingText.setText("No news articles were found.");
                            }
                        } catch (error)
                            {
                                if (this.runId !== runId) return;
                                loadingText.setText("An error occurred. Is the server running?");
                            }
                }

            buildWordPool() 
                {
                    this.articles.forEach(article =>
                        {
                            if (article && article.webTitle)
                                {
                                    article.webTitle.split(" ").forEach(rawWord =>
                                        {
                                            const { tag, word } = analyzeWord(rawWord);
                                            if (word.length >= 4 && !word.includes('http'))
                                                {
                                                    if (!this.wordPoolByTag[tag]) this.wordPoolByTag[tag] = new Set();
                                                    this.wordPoolByTag[tag].add(word);
                                                }
                                        });
                                }
                        });
                }

            async displayNextQuestion() 
                {
                    // Session goal check
                    const questionsAnswered = this.registry.get('sessionQuestionsAnswered');
                    if (questionsAnswered >= 50)
                        {
                            this.showEndGameMessage("Session Complete! Final Score: " + this.score);
                            return;
                        }

                    // Destroy previous question
                    this.questionObjects.forEach(obj => obj.destroy());
                    this.questionObjects = [];
                    this.currentArticleIndex++;

                    this.updateQuestionCounterText();

                    // Check if we have run out of articles
                    if (this.currentArticleIndex >= this.articles.length)
                        {
                            this.add.text(this.scale.width / 2, this.scale.height / 2, 'Category complete!\nReturning to menu...', { fontSize: `${this.L.message.size}px`, fill: '#fff', align: 'center' }).setOrigin(0.5);
                            
                            // Delay so the player can read the message, then go to next scene.
                            this.time.delayedCall(2000, () => {
                                this.scene.start("CategorySelectScene");
                            });
                            return;
                        }

                    // The rest of the function for displaying a question
                    let article = this.articles[this.currentArticleIndex];
                    let validArticleFound = false;
                    if (article && article.webTitle) 
                        {
                            let words = article.webTitle.split(" ");
                            const aiQuestion = this.aiQuestions[article.id];
                            const aiWordIndex = aiQuestion ? words.findIndex(w => analyzeWord(w).word === aiQuestion.answer) : -1;
                            const validIndices = words.map((w, i) => analyzeWord(w).word.length >= 4 ? i : -1).filter(i => i !== -1);

                            if (aiWordIndex !== -1)
                                {
                                    // AI question: options fit the sentence, so wrong picks read as fake news.
                                    this.missingWord = aiQuestion.answer;
                                    words[aiWordIndex] = "_____";
                                    this.headline = words.join(" ");

                                    this.options = [aiQuestion.answer, ...aiQuestion.options].sort(() => Math.random() - 0.5);
                                    this.buildQuestionUI();
                                    validArticleFound = true;
                                }
                            else if (validIndices.length > 0)
                                {
                                    const randomIndex = Math.floor(Math.random() * validIndices.length);
                                    const wordIndex = validIndices[randomIndex];
                                    
                                    this.missingWord = analyzeWord(words[wordIndex]).word;
                                    words[wordIndex] = "_____";
                                    this.headline = words.join(" ");
                                    
                                    const runId = this.runId;
                                    this.options = await this.generateOptions(this.missingWord, article, this.articles);
                                    if (this.runId !== runId) return; // Scene restarted (rotation) meanwhile.
                                    this.buildQuestionUI();
                                    validArticleFound = true;
                                }
                        }
                    if (!validArticleFound)
                        {
                            this.displayNextQuestion(); // This recursive call is now safe.
                        }
                }
            
                // In main.js, inside the NewsGame class...

            // --- REWRITTEN generateOptions with REORDERED TIER LOGIC ---
            async generateOptions(correctWord, originalArticle, allArticles) 
                {
                    const TOTAL_OPTIONS = 10; 

                    let tempOptions = new Set([correctWord]);

                    // TIER 1: Contextual Search
                    // Provides the most interesting distractors. It finds words from
                    // other thematically related articles that have the same grammatical type.
                    if (tempOptions.size < TOTAL_OPTIONS)
                        {
                            const { tag: targetTag } = analyzeWord(correctWord);
                            // Find keywords in the original article
                            const keywords = new Set(nlp(originalArticle.webTitle).nouns().out('array').concat(nlp(originalArticle.webTitle).verbs().out('array')).map(w => analyzeWord(w).word).filter(w => w.length > 3));
                            
                            // Find other articles that share those keywords
                            const scoredArticles = allArticles.filter(a => a.id !== originalArticle.id).map(article => 
                                {
                                    const otherKeywords = new Set(article.webTitle.split(' ').map(w => analyzeWord(w).word));
                                    const score = [...keywords].filter(kw => otherKeywords.has(kw)).length;
                                    return { article, score };
                                }).sort((a, b) => b.score - a.score);

                            // Build a pool of potential words from those similar articles
                            const contextualPool = new Set();
                            scoredArticles.slice(0, 10).forEach(({ article }) =>
                                {
                                    article.webTitle.split(' ').forEach(rawWord =>
                                        {
                                            const { tag, word } = analyzeWord(rawWord);
                                            if (word.length >= 4 && tag === targetTag) contextualPool.add(word);
                                        });
                                });
                            
                            // Add words from the contextual pool until enough options
                            let optionsFromPool = Array.from(contextualPool).filter(w => !tempOptions.has(w));
                            while (tempOptions.size < TOTAL_OPTIONS && optionsFromPool.length > 0)
                                {
                                    tempOptions.add(optionsFromPool.splice(Math.floor(Math.random() * optionsFromPool.length), 1)[0]);
                                }
                        }       

                    // TIER 2: General Grammatical Search
                    // If the contextual search didn't provide enough options, this tier falls back to
                    // picking random words from the entire article collection that have the correct
                    // grammatical type (e.g., any Noun to replace a Noun).
                    if (tempOptions.size < TOTAL_OPTIONS)
                        {
                            const { tag: targetTag } = analyzeWord(correctWord);
                            if (this.wordPoolByTag[targetTag])
                                {
                                    let fallbackPool = Array.from(this.wordPoolByTag[targetTag]).filter(w => !tempOptions.has(w));
                                    while (tempOptions.size < TOTAL_OPTIONS && fallbackPool.length > 0)
                                        {
                                            tempOptions.add(fallbackPool.splice(Math.floor(Math.random() * fallbackPool.length), 1)[0]);
                                        }
                                }
                        }

                    // TIER 3: Semantic Search
                    // This is now the last resort. If still don't have enough options,
                    // Use the Datamuse API to find words that "mean like" the correct answer.
                    if (tempOptions.size < TOTAL_OPTIONS)
                        {
                            // Only ask Datamuse for the exact number of words we still need.
                            const wordsNeeded = TOTAL_OPTIONS - tempOptions.size;
                            const similarWords = await getSemanticallySimilarWords(correctWord, wordsNeeded);
                            similarWords.forEach(word =>
                                {
                                    // Catch to not add more than the total needed
                                    if (tempOptions.size < TOTAL_OPTIONS)
                                        {
                                            tempOptions.add(word);
                                        }
                                });
                        }

                    return Array.from(tempOptions).sort(() => Math.random() - 0.5);
                }

            setupUI()
                {
                    const L = this.L;
                    const canvasCenterX = this.scale.width / 2;

                    // Create each UI element using styles object, sized for the current layout
                    this.add.text(L.title.x, L.title.y, "What's The News?", { ...UI_STYLES.title, fontSize: `${L.title.size}px` })
                        .setOrigin(L.title.originX, 0);

                    this.questionCounterText = this.add.text(L.counter.x, L.counter.y, "Question: 0 / 0", { ...UI_STYLES.counter, fontSize: `${L.statFont}px` })
                        .setOrigin(0.5, 0);
                    this.updateQuestionCounterText();

                    // 1. Create the score text object.
                    this.scoreText = this.add.text(L.score.x, L.score.y, "Score: 0", { ...UI_STYLES.score, fontSize: `${L.statFont}px` });

                    // 2. Call the update function to sync it with the registry data.
                    this.updateScoreText();

                    // Place it below the top row
                    this.add.text(canvasCenterX, L.category.y, this.selectedCategoryLabel, { ...UI_STYLES.categoryTitle, fontSize: `${L.category.size}px` })
                        .setOrigin(0.5, 0); // Center horizontally at the top of its box

                    // Creates and update lives text.
                    this.updateLivesUI_Text();

                    // The "Back to Categories" button
                    this.backToMenuButton = this.add.text(canvasCenterX, L.back.y, '<< Back to Categories',
                        {
                            ...UI_STYLES.backButton,
                            fontSize: `${L.back.size}px`,
                            padding: { left: L.back.padX, right: L.back.padX, top: L.back.padY, bottom: L.back.padY }
                        })
                        .setOrigin(0.5)
                        .setInteractive();

                    this.backToMenuButton.on('pointerdown', () =>
                        {
                            this.scene.start("CategorySelectScene");
                        });
                }

            buildQuestionUI()
                {
                    const L = this.L;
                    this.answered = false;

                    const headlineText = this.add.text(L.headline.x, L.headline.y, this.headline,
                        { ...UI_STYLES.headline, fontSize: `${L.headline.size}px`, wordWrap: { width: L.headline.wrap } });
                    this.questionObjects.push(headlineText);

                    // 2 column layout logic (both orientations)
                    const [column1X, column2X] = L.options.columns;
                    const optionsPerColumn = Math.ceil(this.options.length / 2);
                    const startY = L.options.startY;
                    const ySpacing = L.options.spacingY;

                    this.options.forEach((word, i) =>
                        {
                            let buttonX;
                            let rowIndex;

                            if (i < optionsPerColumn)
                                {
                                    buttonX = column1X;
                                    rowIndex = i;
                                } else
                                    {
                                        buttonX = column2X;
                                        rowIndex = i - optionsPerColumn;
                                    }

                            const buttonY = startY + (rowIndex * ySpacing);
                            const displayWord = word.charAt(0).toUpperCase() + word.slice(1);

                            const btn = this.add.text(buttonX, buttonY, displayWord,
                                {
                                    fontSize: `${L.options.size}px`,
                                    fill: "#fff",
                                    backgroundColor: "#000000",
                                    padding:
                                        {
                                            left: 10,
                                            right: 10,
                                            top: L.options.padY,
                                            bottom: L.options.padY
                                        }
                                })
                            .setOrigin(0.5, 0);
                            fitButtonWidth(btn, L.options.width).setInteractive();
                        
                            btn.setData('originalWord', word); 
                            this.questionObjects.push(btn);
                            btn.on("pointerdown", () => this.handleAnswer(btn, btn.getData('originalWord')));
                        });
                }

            handleAnswer(selectedButton, selectedWord)
                {
                    // Disable all other option buttons
                    this.questionObjects.forEach(obj =>
                        {
                            if (obj.type === 'Text' && obj.input)
                                {
                                    obj.disableInteractive().setBackgroundColor("#555");
                                }
                        });

                    // UPDATE THE HEADLINE TEXT
                    // 1. Replace missing word with the player's chosen word.
                    const completedHeadline = this.headline.replace("_____", selectedWord);
                    
                    // 2. Find the headline text object to modify it.
                    //    The first object pushed in buildQuestionUI is the headline.
                    const headlineTextObject = this.questionObjects[0];
                    
                    // 3. Update its text.
                    headlineTextObject.setText(completedHeadline);

                    this.answered = true;
                    const resultStyle = { fontSize: `${this.L.result.size}px`, align: 'center', wordWrap: { width: this.scale.width - 60 } };
                    const resultX = this.scale.width / 2;

                    let resultText;
                    if (selectedWord === this.missingWord)
                        {
                            this.score += 10;
                            this.registry.set('sessionScore', this.score);
                            this.updateScoreText();
                            selectedButton.setBackgroundColor('#008000');
                            resultText = this.add.text(resultX, this.L.result.y, "✅ Correct!", { ...resultStyle, fill: "#0f0" }).setOrigin(0.5);

                            //Color the headline text green for a correct answer
                            headlineTextObject.setColor("#00ff00");

                        } else 
                            {
                                this.incorrectAnswers++;
                                const currentLives = this.totalIncorrectAllowed - this.incorrectAnswers;
                                this.registry.set('sessionLives', currentLives);
                                this.updateLivesUI_Text();
                                // this.updateLivesUI_ImageExample(); // Lives Sprite
                                selectedButton.setBackgroundColor("#ff0000");
                                const displayAnswer = this.missingWord.charAt(0).toUpperCase() + this.missingWord.slice(1);
                                resultText = this.add.text(resultX, this.L.result.y, `❌ Incorrect! Answer: ${displayAnswer}`, { ...resultStyle, fill: "#ff6b6b" }).setOrigin(0.5);

                                //Color the headline text red for an incorrect answer
                                headlineTextObject.setColor("#ff4d4d"); // A soft red
                            }

                    let questionsAnswered = this.registry.get('sessionQuestionsAnswered');
                    questionsAnswered++;
                    this.registry.set('sessionQuestionsAnswered', questionsAnswered);
                    this.updateQuestionCounterText();
                    
                    this.questionObjects.push(resultText);

                    if (this.incorrectAnswers >= this.totalIncorrectAllowed) 
                        {
                            this.showEndGameMessage("Game Over!");
                        } else 
                            {
                                this.showNextButton();
                            }
                }

            showNextButton() 
                {
                    const { next } = this.L;
                    const nextButton = this.add.text(this.scale.width / 2, next.y, "Next",
                        {
                            fontSize: `${next.size}px`,
                            fill: "#fff",
                            backgroundColor: "#111",
                            padding:
                                {
                                    left: next.padX,
                                    right: next.padX,
                                    top: next.padY,
                                    bottom: next.padY
                                }
                        })
                    .setOrigin(0.5).setInteractive();
                    nextButton.on("pointerdown", () => this.displayNextQuestion());
                    this.questionObjects.push(nextButton);
                }

            showEndGameMessage(message) 
                {
                    this.questionObjects.forEach(obj => obj.destroy());
                    this.questionObjects = [];
                    if (this.backToMenuButton) this.backToMenuButton.destroy();

                    this.registry.set('sessionInProgress', false);
                    this.endMessage = message;

                    const centerX = this.scale.width / 2;
                    const centerY = this.scale.height / 2;
                    const { next } = this.L;

                    this.add.text(centerX, centerY, message,
                        {
                            fontSize: `${this.L.message.endSize}px`,
                            fill: "#ff4d4d",
                            align: 'center',
                            wordWrap: { width: this.scale.width - 80 }
                        }).setOrigin(0.5);

                    const playAgainButton = this.add.text(centerX, centerY + next.size * 4, "Play Again",
                        {
                            fontSize: `${next.size}px`,
                            fill: "#fff",
                            backgroundColor: "#111",
                            padding:
                                {
                                    left: next.padX,
                                    right: next.padX,
                                    top: next.padY,
                                    bottom: next.padY
                                }
                        })
                    .setOrigin(0.5).setInteractive();

                    playAgainButton.on("pointerdown", () => this.scene.start("CategorySelectScene"));
                }
    }

    // Landscape canvas on wide screens, portrait canvas on phones held upright.
    const initialSize = sizeForScreen();

    const config =
        {
            type: Phaser.AUTO,
            width: initialSize.width,
            height: initialSize.height,
            backgroundColor: "#001BCF",
            scene: [StartScene, CategorySelectScene, NewsGame],
            scale:
                {
                    mode: Phaser.Scale.FIT, // Fit the game to the parent container
                    autoCenter: Phaser.Scale.CENTER_BOTH // Center the game horizontally and vertically
                }
        };


const game = new Phaser.Game(config);

// When the device rotates (or the window changes shape), switch canvas shape
// and redraw the running scene in its other layout.
window.addEventListener('resize', () =>
    {
        const size = sizeForScreen();
        if (size.width === game.scale.width) return;

        game.scale.setGameSize(size.width, size.height);
        game.scene.getScenes(true).forEach(scene => scene.relayout ? scene.relayout() : scene.scene.restart());
    });