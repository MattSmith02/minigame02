
# 🤖 BotBash 3D: Arena Combat

A high-performance, browser-based 3D robot combat game built with **React**, **Three.js**, and **React-Three-Fiber**.

## 🚀 How to Run (Local Development)

1.  **Extract** all files into a project folder.
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Launch Dev Server**:
    ```bash
    npm run dev
    ```
4.  **Open Browser**: Navigate to `http://localhost:5173`.

## 🎮 Controls

- **WASD / ARROW KEYS**: Drive and Turn.
- **SPACE**: Activate secondary weapon (Spinner/Wedge lift).
- **GOAL**: Push all enemies out of the arena or reduce their health to zero.

## 🛠 Technical Details

- **Physics Engine**: Custom "Fake Physics" using velocity vectors and collision damping.
- **Combat System**: Health-based with knockback modifiers. Spinners deal more damage but have lower mass.
- **Visuals**: Low-poly industrial aesthetic with a CRT overlay and procedural "Robot" generation.
- **AI**: State-based pathing that targets the player based on orientation and proximity.

## 📁 File Structure

- `App.tsx`: Main game loop and physics logic.
- `components/Robot.tsx`: Procedural 3D robot models and animations.
- `components/Arena.tsx`: 3D environment and boundary logic.
- `constants.ts`: Tuning variables for speed, friction, and knockback.
- `design-system.html`: Figma-ready UI components and color tokens.
