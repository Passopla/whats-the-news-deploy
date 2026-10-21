import { isPortrait } from './layout.js';

export default class StartScene extends Phaser.Scene
    {

        constructor()

            {
                // Key for this scene, which we will use to load it.
                super("StartScene");
            }

        create()
            {
                const portrait = isPortrait(this);
                const centerX = this.scale.width / 2;

                // --- Game Title ---
               this.add.text(centerX, portrait ? 330 : 150, "What's The News?",
                    {
                        fontFamily: 'Georgia',
                        fontSize: portrait ? '56px' : '52px',
                        fill: '#ffffff',
                        fontStyle: 'bold',
                        align: 'center',
                        wordWrap: { width: this.scale.width - 40 }
                    }).setOrigin(0.5);

                // --- Game Description ---
                const descriptionText = "Challenge your vocabulary by filling in the blank in real headlines from The Guardian. Wrong choices produce fake news headlines, which can actually get pretty funny.\n All while learning what's going on in the world today.";
                this.add.text(centerX, portrait ? 590 : 250, descriptionText,
                    {
                        fontFamily: 'Arial',
                        fontSize: portrait ? '30px' : '22px',
                        fill: '#dddddd',
                        align: 'center',
                        lineSpacing: portrait ? 8 : 0,
                        wordWrap: { width: portrait ? 500 : 600 }
                    }).setOrigin(0.5);

                 // --- Play Button ---
                const playButton = this.add.text(centerX, portrait ? 860 : 400, "Play",
                    {
                        fontFamily: 'Arial',
                        fontSize: portrait ? '44px' : '32px',
                        fill: '#ffffff',
                        backgroundColor: '#009933', // green color
                        padding: portrait ? { left: 64, right: 64, top: 18, bottom: 18 } : { left: 40, right: 40, top: 10, bottom: 10 }
                    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

                // --- Button Events ---
                playButton.on('pointerover', () => {
                    playButton.setBackgroundColor('#00cc44'); // Lighter green on hover
                });

                playButton.on('pointerout', () => {
                    playButton.setBackgroundColor('#009933'); // Return to original color
                });

                playButton.on('pointerdown', () => {
                    // When clicked, transition to the category selection scene.
                    this.scene.start("CategorySelectScene");
                });
            }
    }
