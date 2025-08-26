export default class StartScene extends Phaser.Scene 
    {

        constructor() 
                
            {
                // Key for this scene, which we will use to load it.
                super("StartScene");
            }

        create() 
            {
                // --- Game Title ---
               this.add.text(400, 150, "What's The News?",
                    {
                        fontFamily: 'Georgia',
                        fontSize: '52px',
                        fill: '#ffffff',
                        fontStyle: 'bold'
                    }).setOrigin(0.5);

                // --- Game Description ---
                const descriptionText = "Challenge your vocabulary by filling in the blank in real headlines from The Guardian. Or produce some fake news headlines of your own! It can geet pretty funny.";
                this.add.text(400, 250, descriptionText, 
                    {
                        fontFamily: 'Arial',
                        fontSize: '22px',
                        fill: '#dddddd',
                        align: 'center',
                        wordWrap: { width: 600 }
                    }).setOrigin(0.5);

                 // --- Play Button ---
                const playButton = this.add.text(400, 400, "Play", 
                    {
                        fontFamily: 'Arial',
                        fontSize: '32px',
                        fill: '#ffffff',
                        backgroundColor: '#009933', // green color
                        padding: { left: 40, right: 40, top: 10, bottom: 10 }
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