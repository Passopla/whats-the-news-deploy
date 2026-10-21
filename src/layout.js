// Two canvas shapes: the classic landscape canvas, and a taller one for phones held upright.
// Scenes check isPortrait() and place everything from the canvas size, so both look designed.
export const LANDSCAPE_SIZE = { width: 800, height: 600 };
export const PORTRAIT_SIZE = { width: 600, height: 1200 };

export const sizeForScreen = () => window.innerHeight > window.innerWidth ? PORTRAIT_SIZE : LANDSCAPE_SIZE;

export const isPortrait = (scene) => scene.scale.height > scene.scale.width;

// Gives a text button a fixed width so button grids line up,
// shrinking the font first if the label would not fit.
export const fitButtonWidth = (button, width) =>
    {
        let fontSize = parseInt(button.style.fontSize, 10);
        while (button.width > width && fontSize > 12)
            {
                fontSize--;
                button.setFontSize(fontSize);
            }
        button.setAlign('center');
        button.setFixedSize(width, 0);
        return button;
    };
