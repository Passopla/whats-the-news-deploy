export const CATEGORIES = [
    {
        label: 'Culture Mix',
        key: 'general',
        description: 'A mix of Music, Film, Art, and TV.'
    },
    {
        label: 'Music',
        key: 'music',
        description: 'Headlines from the world of music.'
    },
    {
        label: 'Film',
        key: 'film',
        description: 'Headlines from the world of movies.'
    },
    {
        label: 'Technology',
        key: 'technology',
        description: 'The latest in tech news.'
    },
    {
        label: 'Lifestyle',
        key: 'lifeandstyle',
        description: 'Trends and tips for modern living.' 
    },
    {
        label: 'Travel',
        key: 'travel',
        description: 'Explore the world with the latest travel news.'
    },
    {
        label: 'World News',
        key: 'world',
        description: 'Global headlines and international affairs.'
    },
    {
        label: 'Politics',
        key: 'politics',
        description: 'Updates on political events and policies.'
    },
    {
        label: 'Business',
        key: 'business',
        description: 'Market trends and economic news.'
    },
    {
        label: 'Science',
        key: 'science',
        description: 'Discoveries and advancements in science.'
    },
    {
        label: 'Art & Design',
        key: 'artanddesign', 
        description: 'Insights into the world of art and design.'
    },
    {
        label: 'TV & Radio',
        key: 'tv-and-radio',
        description: 'Latest updates from television and radio.'
    },
    {   label: 'Family',
        key: 'family',
        description: 'News and tips for family life.'
    },
    {
        label: 'Men',
        key: 'men',
        description: 'Headlines from the Men\'s section.'
    },
    {
        label: 'Women',
        key: 'women',
        description: 'Headlines from the women\'s section.'
    },
    {
        label: 'Fashion',
        key: 'fashion',
        description: 'Headlines from the fashion section.'
    },
    {
        label: 'Wellness',
        key: 'wellness',
        description: 'Stay informed on health and wellness topics.'
    },
    {
        label: 'Dating',
        key: 'dating',
        description: 'Headlines about dating and relationships.'
    },
    {
        label: 'Opinion',
        key: 'opinion',
        description: 'Opinions Section.'
    },
    {
        label: 'Money',
        key: 'money',
        description: 'Opinions Section.'
    }
];

import { isPortrait, fitButtonWidth } from './layout.js';

export default class CategorySelectScene extends Phaser.Scene
    {
        constructor() 
            {
                super("CategorySelectScene");
            }

        create() 
            {
                // Initialize Session Variables
                if (!this.registry.get('sessionInProgress'))
                    {
                        this.registry.set('sessionScore', 0);
                        this.registry.set('sessionLives', 3);
                        this.registry.set('sessionQuestionsAnswered', 0);
                    }

                const portrait = isPortrait(this);
                const canvasWidth = this.scale.width;

                this.add.text(canvasWidth / 2, portrait ? 90 : 50, "Choose a Category",
                    {
                        fontFamily: 'Arial',
                        fontSize: portrait ? '48px' : '40px',
                        fill: '#fff',
                        fontStyle: 'bold'
                    }).setOrigin(0.5);

                // --- Grid Layout Algorithm ---
                // Landscape: 5 columns x 4 rows. Portrait: 3 columns x 7 rows.
                const numColumns = portrait ? 3 : 5;
                const startY = portrait ? 220 : 150;
                const buttonSpacingY = portrait ? 110 : 70;
                const horizontalPadding = portrait ? 105 : 100;
                const buttonWidth = portrait ? 180 : 140;

                const availableWidth = canvasWidth - (horizontalPadding * 2);
                const columnWidth = availableWidth / (numColumns - 1);

                const columnXPositions = [];
                for (let i = 0; i < numColumns; i++) 
                    {
                        columnXPositions.push(horizontalPadding + (i * columnWidth));
                    }

                CATEGORIES.forEach((category, index) => 
                    {
                        const columnIndex = index % numColumns;
                        const rowIndex = Math.floor(index / numColumns);
                        const buttonX = columnXPositions[columnIndex];
                        const buttonY = startY + (rowIndex * buttonSpacingY);

                        const button = this.add.text(buttonX, buttonY, category.label,
                            {
                                fontSize: portrait ? '26px' : '20px',
                                fill: '#fff',
                                backgroundColor: '#333',
                                padding:
                                    {
                                        left: 10,
                                        right: 10,
                                        top: portrait ? 14 : 8,
                                        bottom: portrait ? 14 : 8
                                    }
                            }).setOrigin(0.5);
                        fitButtonWidth(button, buttonWidth).setInteractive();

                        // --- CORRECTED EVENT HANDLERS ---

                        button.on('pointerover', () => button.setBackgroundColor('#555'));

                        button.on('pointerout', () => button.setBackgroundColor('#333'));

                        button.on('pointerdown', () => 
                            {
                                // Both actions now happen inside this single 'pointerdown' callback.
                                this.registry.set('sessionInProgress', true);
                                this.scene.start('NewsGame', { categoryKey: category.key });
                            });
                        
                    });
                // --------------------------------
                    const linkStyle = 
                    {
                        fontFamily: 'Arial',
                        fontSize: portrait ? '22px' : '14px',
                        fill: '#fff', // link blue
                        padding: { top: 10, bottom: 10 } // taller tap area
                    };

                    // 2. Create the text object at the bottom of the canvas.
                    const sourceText = this.add.text(canvasWidth / 2, portrait ? 1120 : 555, "All articles sourced from TheGuardian.com", linkStyle)
                        .setOrigin(0.5)
                        .setInteractive({ useHandCursor: true });

                    // 3. Define the click action to open a new tab.
                    sourceText.on('pointerdown', () => {
                        window.open('https://www.theguardian.com', '_blank');
                    });

                    // 4. hover effects.
                    sourceText.on('pointerover', () => {
                        // underline on hover for link feel
                        sourceText.setStyle({ ...linkStyle, underline: { color: '#80b3ff', thickness: 1 } });
                    });

                    sourceText.on('pointerout', () => {
                        // Remove the underline when the mouse leaves
                        sourceText.setStyle(linkStyle);
                    });
                    // --------------------------------------------------------------------
            }
    }
            