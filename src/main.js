import StartScene from './start.js';
import CategorySelectScene from './selection.js';
import { CATEGORIES } from './selection.js';

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
        const word = rawWord.toLowerCase().replace(/[.,'":;()]/g, '');
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
                    this.totalArticles = 0;
                }


            updateLivesUI_Text() 
            {
                // constant variable, stored in the registry.
                const currentLives = this.registry.get('sessionLives');
                
                // If the text object doesn't exist yet, create it.
                if (!this.livesText) 
                    {
                        this.livesText = this.add.text(650, 50, `Lives: ${currentLives}`, UI_STYLES.lives);
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
                    this.setupUI(); // Function to create all UI elements.
                
                    const loadingText = this.add.text(400, 300, "Loading headlines...",
                        {
                            fontSize: "20px",
                            fill: "#fff"
                        }).setOrigin(0.5);

                    this.fetchArticlesAndStart(loadingText);
                }

            async fetchArticlesAndStart(loadingText) 
                {
                    const serverUrl = `/api/news?category=${this.selectedCategory}`;
                    console.log(`Fetching from category: ${this.selectedCategory}`);

                    try 
                        {
                            const response = await fetch(serverUrl);
                            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                
                            const data = await response.json();

                            if (data.response && data.response.status === "ok" && data.response.results) 
                                {
                                    this.articles = data.response.results.filter(a => a.webTitle && a.webTitle.length > 30);

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
                            this.add.text(400, 300, 'Category complete!\nReturning to menu...', { fontSize: '24px', fill: '#fff', align: 'center' }).setOrigin(0.5);
                            
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
                            const validIndices = words.map((w, i) => analyzeWord(w).word.length >= 4 ? i : -1).filter(i => i !== -1);
                            
                            if (validIndices.length > 0) 
                                {
                                    const randomIndex = Math.floor(Math.random() * validIndices.length);
                                    const wordIndex = validIndices[randomIndex];
                                    
                                    this.missingWord = analyzeWord(words[wordIndex]).word;
                                    words[wordIndex] = "_____";
                                    this.headline = words.join(" ");
                                    
                                    this.options = await this.generateOptions(this.missingWord, article, this.articles);
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
                    // Create each UI element using styles object
                    this.add.text(50, 20, "What's The News?", UI_STYLES.title);

                    this.questionCounterText = this.add.text(400, 20, "Question: 0 / 0", UI_STYLES.counter)
                        .setOrigin(0.5, 0);

                    // 1. Create the score text object.
                    this.scoreText = this.add.text(650, 20, "Score: 0", UI_STYLES.score);

                    // 2. Call the update function to sync it with the registry data.
                    this.updateScoreText();

                    const canvasCenterX = this.sys.game.config.width / 2;
                    // Place it below the top row (e.g., at y=65)
                    this.add.text(canvasCenterX, 65, this.selectedCategoryLabel, UI_STYLES.categoryTitle)
                        .setOrigin(0.5, 0); // Center horizontally at the top of its box

                    // Creates and update lives text.
                    this.updateLivesUI_Text(); 

                    // The "Back to Categories" button
                    const buttonX = this.sys.game.config.width / 2;
                    const buttonY = 560;

                    this.backToMenuButton = this.add.text(buttonX, buttonY, '<< Back to Categories', UI_STYLES.backButton)
                        .setOrigin(0.5)
                        .setInteractive();

                    this.backToMenuButton.on('pointerdown', () =>
                        {
                            this.scene.start("CategorySelectScene");
                        });
                }

            buildQuestionUI()
                {
                    const headlineText = this.add.text(50, 100, this.headline, UI_STYLES.headline);
                    this.questionObjects.push(headlineText);
                    
                    // 2 column layout logic
                    const canvasCenterX = this.sys.game.config.width / 2;
                    const columnSpacing = 350;
                    const column1X = canvasCenterX - (columnSpacing / 2);
                    const column2X = canvasCenterX + (columnSpacing / 2);
                    const optionsPerColumn = this.options.length / 2;
                    const startY = 200;
                    const ySpacing = 50;

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
                                    fontSize: "18px",
                                    fill: "#fff",
                                    backgroundColor: "#000000",
                                    padding:
                                        {
                                            left: 10,
                                            right: 10,
                                            top: 5,
                                            bottom: 5
                                        }
                                })
                            .setOrigin(0.5, 0)
                            .setInteractive();
                        
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

                    let resultText;
                    if (selectedWord === this.missingWord)
                        {
                            this.score += 10;
                            this.registry.set('sessionScore', this.score);
                            this.updateScoreText();
                            selectedButton.setBackgroundColor('#008000');
                            resultText = this.add.text(400, 450, "✅ Correct!", { fontSize: "24px", fill: "#0f0" }).setOrigin(0.5);

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
                                resultText = this.add.text(400, 450, `❌ Incorrect! Answer: ${displayAnswer}`, { fontSize: "24px", fill: "#f00" }).setOrigin(0.5);

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
                    const nextButton = this.add.text(400, 520, "Next", 
                        {
                            fontSize: "22px",
                            fill: "#fff",
                            backgroundColor: "#111",
                            padding:
                                {
                                    left: 10,
                                    right: 10,
                                    top: 5,
                                    bottom: 5
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

                    this.add.text(400, 300, message,
                        {
                            fontSize: "48px", 
                            fill: "#ff4d4d", 
                            align: 'center' 
                        }).setOrigin(0.5);

                    const playAgainButton = this.add.text(400, 400, "Play Again", 
                        {
                            // Adjusted Y for better centering
                            fontSize: "22px", 
                            fill: "#fff", 
                            backgroundColor: "#111", 
                            padding:
                                {
                                    left: 10,
                                    right: 10,
                                    top: 5,
                                    bottom: 5
                                }
                        })
                    .setOrigin(0.5).setInteractive();

                    playAgainButton.on("pointerdown", () => this.scene.start("CategorySelectScene"));
                }
    }

    const config = 
        {
            type: Phaser.AUTO,
            width: 800,
            height: 600,
            backgroundColor: "#001BCF",
            scene: [StartScene, CategorySelectScene, NewsGame],
            scale: 
                {
                    mode: Phaser.Scale.FIT, // Fit the game to the parent container
                    autoCenter: Phaser.Scale.CENTER_BOTH // Center the game horizontally and vertically
                }
        };


new Phaser.Game(config);