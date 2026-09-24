/* ─── Константы ──────────────────────────────────────────── */

const PLAYFIELD_COLUMNS = 10;
const PLAYFIELD_ROWS    = 20;

const TETROMINO_NAMES = ["I", "J", "L", "O", "S", "Z", "T"];

const TETROMINOES = {
    I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    J: [[1,0,0],[1,1,1],[0,0,0]],
    L: [[0,0,1],[1,1,1],[0,0,0]],
    O: [[1,1],[1,1]],
    S: [[0,1,1],[1,1,0],[0,0,0]],
    Z: [[1,1,0],[0,1,1],[0,0,0]],
    T: [[0,1,0],[1,1,1],[0,0,0]],
};

const SAD = [
    [0,0,1,0,0,0,0,1,0,0],
    [0,1,0,0,0,0,0,0,1,0],
    [1,0,0,0,0,0,0,0,0,1],
    [0,0,1,0,0,0,0,1,0,0],
    [0,1,1,0,0,0,0,1,1,0],
    [0,1,1,0,0,0,0,1,1,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,1,1,1,1,0,0,0],
    [0,0,1,0,0,0,0,1,0,0],
    [0,1,0,0,0,0,0,0,1,0],
];

const SCORES_PER_LINES = { 1: 100, 2: 300, 3: 500, 4: 800 };
const TICK_DELAY = 700;
const SAFETY_PX = 2;

/* ─── Построение поля ────────────────────────────────────── */

const grid = document.querySelector(".grid");
for (let i = 0; i < PLAYFIELD_ROWS * PLAYFIELD_COLUMNS; i++) {
    grid.appendChild(document.createElement("div"));
}
const cells = document.querySelectorAll(".grid > div");

function refreshLayout() {
    const root = document.documentElement;
    const vv   = window.visualViewport;

    const vpH = vv ? vv.height : window.innerHeight;
    const vpW = vv ? vv.width  : window.innerWidth;

    root.style.setProperty("--vh-px", vpH + "px");
    root.style.setProperty("--vw-px", vpW + "px");

    const wrapper = document.querySelector(".game-wrapper");
    const stats   = document.querySelector(".stats");
    const gridEl  = document.querySelector(".grid");
    if (!wrapper || !stats || !gridEl) return;

    /* --- размеры обёртки без её собственных padding'ов --- */
    const wcs = getComputedStyle(wrapper);
    const wPadV = (parseFloat(wcs.paddingTop)    || 0)
                + (parseFloat(wcs.paddingBottom) || 0);
    const wPadH = (parseFloat(wcs.paddingLeft)   || 0)
                + (parseFloat(wcs.paddingRight)  || 0);
    const wGap  = parseFloat(wcs.rowGap) || 0;

    const wRect = wrapper.getBoundingClientRect();
    const wrapperW = wRect.width  - wPadH;
    const wrapperH = wRect.height - wPadV;

    /* --- высота шапки --- */
    const statsH = stats.getBoundingClientRect().height;

    /* --- сколько остаётся на само поле --- */
    const gridSpaceH = wrapperH - statsH - wGap;
    const gridSpaceW = wrapperW;

    if (gridSpaceH <= 0 || gridSpaceW <= 0) return;

    /* --- внутренние зазоры .grid --- */
    const gcs = getComputedStyle(gridEl);
    const gPadV = (parseFloat(gcs.paddingTop)    || 0)
                + (parseFloat(gcs.paddingBottom) || 0);
    const gPadH = (parseFloat(gcs.paddingLeft)   || 0)
                + (parseFloat(gcs.paddingRight)  || 0);
    const gGapV = (parseFloat(gcs.rowGap)    || 0) * (PLAYFIELD_ROWS    - 1);
    const gGapH = (parseFloat(gcs.columnGap) || 0) * (PLAYFIELD_COLUMNS - 1);

    /* --- размер одной клетки (мин. из ограничений по H и W) --- */
    const cellFromH = (gridSpaceH - gPadV - gGapV - SAFETY_PX) / PLAYFIELD_ROWS;
    const cellFromW = (gridSpaceW - gPadH - gGapH - SAFETY_PX) / PLAYFIELD_COLUMNS;

    let cellSize = Math.min(cellFromH, cellFromW);
    if (!isFinite(cellSize) || cellSize < 4) cellSize = 4;
    /* округляем ВНИЗ до 0.5px */
    cellSize = Math.floor(cellSize * 2) / 2;

    /* --- итоговый размер поля в px --- */
    const finalW = cellSize * PLAYFIELD_COLUMNS + gGapH + gPadH;
    const finalH = cellSize * PLAYFIELD_ROWS    + gGapV + gPadV;

    gridEl.style.width  = finalW + "px";
    gridEl.style.height = finalH + "px";
}

/* ─── Утилиты ────────────────────────────────────────────── */

function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function convertPositionToIndex(row, column) {
    return row * PLAYFIELD_COLUMNS + column;
}

function rotateMatrix(matrix) {
    const N = matrix.length;
    const rotated = [];
    for (let i = 0; i < N; i++) {
        rotated[i] = [];
        for (let j = 0; j < N; j++) {
            rotated[i][j] = matrix[N - j - 1][i];
        }
    }
    return rotated;
}

/* ─── Класс Tetris ───────────────────────────────────────── */

class Tetris {
    constructor() {
        this.playfield;
        this.tetromino;
        this.gameOver = false;
        this.init();
    }

    init() {
        this.generatePlayField();
        this.generateTetromino();
    }

    generatePlayField() {
        this.playfield = new Array(PLAYFIELD_ROWS)
            .fill()
            .map(() => new Array(PLAYFIELD_COLUMNS).fill(0));
    }

    generateTetromino() {
        const name = getRandomElement(TETROMINO_NAMES);
        const matrix = TETROMINOES[name];

        const column = PLAYFIELD_COLUMNS / 2 - Math.floor(matrix.length / 2);
        const row = -2;

        this.tetromino = {
            name, matrix, row, column,
            ghostRow: row,
            ghostColumn: column,
        };

        this.calculateGhostPosition();
    }

    isOutsideOfGameBoard(row, col) {
        return (
            this.tetromino.column + col < 0 ||
            this.tetromino.column + col >= PLAYFIELD_COLUMNS ||
            this.tetromino.row + row >= this.playfield.length
        );
    }

    isCollides(row, column) {
        return this.playfield[this.tetromino.row + row]?.[this.tetromino.column + column];
    }

    isValid() {
        const size = this.tetromino.matrix.length;
        for (let row = 0; row < size; row++) {
            for (let column = 0; column < size; column++) {
                if (!this.tetromino.matrix[row][column]) continue;
                if (this.isOutsideOfGameBoard(row, column)) return false;
                if (this.isCollides(row, column)) return false;
            }
        }
        return true;
    }

    findFilledRows() {
        const filledRows = [];
        for (let row = 0; row < PLAYFIELD_ROWS; row++) {
            if (this.playfield[row].every(Boolean)) filledRows.push(row);
        }
        return filledRows;
    }

    dropRowAbove(rowI) {
        for (let row = rowI; row > 0; row--) {
            this.playfield[row] = this.playfield[row - 1];
        }
        this.playfield[0] = new Array(PLAYFIELD_COLUMNS).fill(0);
    }

    removeFilledRows(filledRows) {
        filledRows.forEach(row => this.dropRowAbove(row));
    }

    processFilledRows() {
        const filledLines = this.findFilledRows();
        this.removeFilledRows(filledLines);
        return filledLines.length;
    }

    isOutsideOfTopBoard(row) {
        return this.tetromino.row + row < 0;
    }

    placeTetromino() {
        const size = this.tetromino.matrix.length;
        for (let row = 0; row < size; row++) {
            for (let column = 0; column < size; column++) {
                if (!this.tetromino.matrix[row][column]) continue;
                if (this.isOutsideOfTopBoard(row)) {
                    this.gameOver = true;
                    return;
                }
                this.playfield[this.tetromino.row + row][this.tetromino.column + column] = this.tetromino.name;
            }
        }

        const linesCount = this.processFilledRows();
        if (linesCount > 0) {
            const points = SCORES_PER_LINES[linesCount] ?? linesCount * 100;
            addScore(points, linesCount);
        }

        this.generateTetromino();
    }

    moveTetrominoDown() {
        this.tetromino.row += 1;
        if (!this.isValid()) {
            this.tetromino.row -= 1;
            this.placeTetromino();
        }
    }

    moveTetrominoLeft() {
        this.tetromino.column -= 1;
        if (!this.isValid()) this.tetromino.column += 1;
        else this.calculateGhostPosition();
    }

    moveTetrominoRight() {
        this.tetromino.column += 1;
        if (!this.isValid()) this.tetromino.column -= 1;
        else this.calculateGhostPosition();
    }

    rotateTetromino() {
        const oldMatrix = this.tetromino.matrix;
        const oldRow    = this.tetromino.row;
        const oldColumn = this.tetromino.column;

        this.tetromino.matrix = rotateMatrix(this.tetromino.matrix);

        if (this.isValid()) {
            this.calculateGhostPosition();
            return;
        }

        const isI = this.tetromino.name === "I";
        const kicks = isI
            ? [[0,-1],[0,-2],[0,1],[0,2],[-1,-1],[-1,1]]
            : [[0,-1],[0,1],[-1,-1],[-1,1],[-1,0]];

        for (const [dRow, dCol] of kicks) {
            this.tetromino.row    = oldRow    + dRow;
            this.tetromino.column = oldColumn + dCol;
            if (this.isValid()) {
                this.calculateGhostPosition();
                return;
            }
        }

        this.tetromino.matrix = oldMatrix;
        this.tetromino.row    = oldRow;
        this.tetromino.column = oldColumn;
    }

    dropTetrominoDown() {
        this.tetromino.row = this.tetromino.ghostRow;
        this.placeTetromino();
    }

    calculateGhostPosition() {
        const originalRow = this.tetromino.row;
        this.tetromino.row++;
        while (this.isValid()) this.tetromino.row++;
        this.tetromino.ghostRow = this.tetromino.row - 1;
        this.tetromino.ghostColumn = this.tetromino.column;
        this.tetromino.row = originalRow;
    }
}

/* ─── Состояние приложения ───────────────────────────────── */

let tetris;
let hammer;
let requestId;
let timeoutId;
let score = 0;
let linesTotal = 0;

/** @type {"menu" | "playing" | "paused" | "over"} */
let state = "menu";

/* ─── Ссылки на DOM ──────────────────────────────────────── */

const scoreEl         = document.getElementById("score");
const linesEl         = document.getElementById("lines");
const finalScoreEl    = document.getElementById("final-score");
const pauseScoreEl    = document.getElementById("pause-score");

const startScreen     = document.getElementById("start-screen");
const pauseScreen     = document.getElementById("pause-screen");
const overScreen      = document.getElementById("game-over-screen");

const pauseBtn        = document.getElementById("pause-btn");
const resumeBtn       = document.getElementById("resume-btn");
const pauseRestartBtn = document.getElementById("pause-restart-btn");

/* ─── Счёт ───────────────────────────────────────────────── */

function addScore(points, lines) {
    score += points;
    linesTotal += lines;
    scoreEl.textContent = score;
    linesEl.textContent = linesTotal;
}

function resetScore() {
    score = 0;
    linesTotal = 0;
    scoreEl.textContent = 0;
    linesEl.textContent = 0;
}

/* ─── Отрисовка ──────────────────────────────────────────── */

function drawTetromino() {
    const name = tetris.tetromino.name;
    const size = tetris.tetromino.matrix.length;
    for (let row = 0; row < size; row++) {
        for (let column = 0; column < size; column++) {
            if (!tetris.tetromino.matrix[row][column]) continue;
            if (tetris.tetromino.row + row < 0) continue;
            const index = convertPositionToIndex(
                tetris.tetromino.row + row,
                tetris.tetromino.column + column
            );
            cells[index].classList.add(name);
        }
    }
}

function drawGhostTetromino() {
    const size = tetris.tetromino.matrix.length;
    for (let row = 0; row < size; row++) {
        for (let column = 0; column < size; column++) {
            if (!tetris.tetromino.matrix[row][column]) continue;
            if (tetris.tetromino.ghostRow + row < 0) continue;
            const index = convertPositionToIndex(
                tetris.tetromino.ghostRow + row,
                tetris.tetromino.ghostColumn + column
            );
            cells[index].classList.add("ghost");
        }
    }
}

function drawPlayfield() {
    for (let row = 0; row < PLAYFIELD_ROWS; row++) {
        for (let column = 0; column < PLAYFIELD_COLUMNS; column++) {
            if (!tetris.playfield[row][column]) continue;
            const index = convertPositionToIndex(row, column);
            cells[index].classList.add(tetris.playfield[row][column]);
        }
    }
}

function draw() {
    cells.forEach(cell => cell.removeAttribute("class"));
    drawPlayfield();
    drawTetromino();
    drawGhostTetromino();
}

function drawSad() {
    const TOP_OFFSET = 5;
    for (let row = 0; row < SAD.length; row++) {
        for (let column = 0; column < SAD[0].length; column++) {
            if (!SAD[row][column]) continue;
            const index = convertPositionToIndex(TOP_OFFSET + row, column);
            cells[index].classList.add("sad");
        }
    }
}

/* ─── Игровой цикл ───────────────────────────────────────── */

function startLoop() {
    timeoutId = setTimeout(() => {
        requestId = requestAnimationFrame(moveDown);
    }, TICK_DELAY);
}

function stopLoop() {
    cancelAnimationFrame(requestId);
    clearTimeout(timeoutId);
}

function moveDown() {
    if (state !== "playing") return;

    tetris.moveTetrominoDown();
    draw();
    stopLoop();

    if (tetris.gameOver) {
        toGameOver();
        return;
    }
    startLoop();
}

function moveLeft()  {
    if (state !== "playing") return;
    tetris.moveTetrominoLeft();
    draw();
}

function moveRight() {
    if (state !== "playing") return;
    tetris.moveTetrominoRight();
    draw();
}

function rotate() {
    if (state !== "playing") return;
    tetris.rotateTetromino();
    draw();
}

function dropDown() {
    if (state !== "playing") return;

    tetris.dropTetrominoDown();
    draw();
    stopLoop();

    if (tetris.gameOver) {
        toGameOver();
        return;
    }
    startLoop();
}

/* ─── Пауза ──────────────────────────────────────────────── */

function pauseGame() {
    if (state !== "playing") return;
    state = "paused";
    stopLoop();

    pauseScoreEl.textContent = score;
    pauseScreen.classList.remove("hidden");
    pauseBtn.setAttribute("aria-label", "Продолжить");
}

function resumeGame() {
    if (state !== "paused") return;
    state = "playing";
    pauseScreen.classList.add("hidden");
    pauseBtn.setAttribute("aria-label", "Пауза");
    startLoop();
}

function togglePause() {
    if (state === "playing") pauseGame();
    else if (state === "paused") resumeGame();
}

/* ─── Конец игры ─────────────────────────────────────────── */

function toGameOverAnimation(onComplete) {
    const filledCells = [...cells].filter(cell => cell.classList.length > 0);

    filledCells.forEach((cell, i) => {
        setTimeout(() => cell.classList.add("hide"), i * 10);
        setTimeout(() => cell.removeAttribute("class"), i * 10 + 500);
    });

    const sadDelay = filledCells.length * 10 + 1000;
    setTimeout(drawSad, sadDelay);
    setTimeout(onComplete, sadDelay + 800);
}

function toGameOver() {
    state = "over";
    stopLoop();
    pauseScreen.classList.add("hidden");
    document.removeEventListener("keydown", onKeydown);
    if (hammer) hammer.off("panstart panleft panright swipedown pandown tap");

    toGameOverAnimation(() => {
        finalScoreEl.textContent = score;
        overScreen.classList.remove("hidden");
    });
}

/* ─── Старт / рестарт ────────────────────────────────────── */

function startGame() {
    document.activeElement?.blur();
    if (hammer) hammer.off("panstart panleft panright swipedown pandown tap");
    document.removeEventListener("keydown", onKeydown);

    startScreen.classList.add("hidden");
    overScreen.classList.add("hidden");
    pauseScreen.classList.add("hidden");
    pauseBtn.setAttribute("aria-label", "Пауза");

    tetris = new Tetris();
    resetScore();
    state = "playing";

    initKeydown();
    initTouch();

    refreshLayout();   // пересчёт размера поля перед первым кадром

    draw();
    startLoop();
}

/* ─── Управление ─────────────────────────────────────────── */

function onKeydown(event) {
    // P / Esc работают и в игре, и на паузе
    if (event.key === "p" || event.key === "P" || event.key === "Escape") {
        event.preventDefault();
        togglePause();
        return;
    }

    if (state !== "playing") return;

    switch (event.key) {
        case "ArrowDown":  event.preventDefault(); moveDown();  break;
        case "ArrowLeft":  event.preventDefault(); moveLeft();  break;
        case "ArrowRight": event.preventDefault(); moveRight(); break;
        case "ArrowUp":    event.preventDefault(); rotate();    break;
        case " ":          event.preventDefault(); dropDown();  break;
    }
}

function initKeydown() {
    document.addEventListener("keydown", onKeydown);
}

function initTouch() {
    document.addEventListener("dblclick", e => e.preventDefault());

    hammer = new Hammer(document.querySelector("body"));
    hammer.get("pan").set({ direction: Hammer.DIRECTION_ALL });
    hammer.get("swipe").set({ direction: Hammer.DIRECTION_ALL });

    // Не реагируем на жесты, если тап/свайп начался по элементу UI
    const startedOnUI = (e) =>
        e.target.closest(".overlay, .pause-btn, .menu-btn") !== null;

    const threshold = 30;
    let deltaX = 0;
    let deltaY = 0;

    hammer.on("panstart", e => {
        if (startedOnUI(e)) return;
        deltaX = 0;
        deltaY = 0;
    });

    hammer.on("panleft", e => {
        if (state !== "playing" || startedOnUI(e)) return;
        if (Math.abs(e.deltaX - deltaX) > threshold) {
            moveLeft();
            deltaX = e.deltaX;
            deltaY = e.deltaY;
        }
    });

    hammer.on("panright", e => {
        if (state !== "playing" || startedOnUI(e)) return;
        if (Math.abs(e.deltaX - deltaX) > threshold) {
            moveRight();
            deltaX = e.deltaX;
            deltaY = e.deltaY;
        }
    });

    hammer.on("pandown", e => {
        if (state !== "playing" || startedOnUI(e)) return;
        if (Math.abs(e.deltaY - deltaY) > threshold) {
            moveDown();
            deltaX = e.deltaX;
            deltaY = e.deltaY;
        }
    });

    hammer.on("swipedown", e => {
        if (state !== "playing" || startedOnUI(e)) return;
        dropDown();
    });

    hammer.on("tap", e => {
        if (state !== "playing" || startedOnUI(e)) return;
        rotate();
    });
}

/* ─── Обновление размеров при изменениях ─────────────────── */

refreshLayout();

window.addEventListener("resize", refreshLayout);
window.addEventListener("orientationchange", () => {
    // на iOS/Android размеры меняются с задержкой после поворота
    setTimeout(refreshLayout, 100);
    setTimeout(refreshLayout, 350);
});

if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", refreshLayout);
    window.visualViewport.addEventListener("scroll", refreshLayout);
}

document.fonts?.ready.then(refreshLayout);
window.addEventListener("load", refreshLayout);

/* ─── Точка входа ────────────────────────────────────────── */

document.getElementById("start-btn").addEventListener("click", startGame);
document.getElementById("restart-btn").addEventListener("click", startGame);
pauseBtn.addEventListener("click", togglePause);
resumeBtn.addEventListener("click", resumeGame);
pauseRestartBtn.addEventListener("click", startGame);

/* Показываем стартовый экран, игру не запускаем. */
startScreen.classList.remove("hidden");
