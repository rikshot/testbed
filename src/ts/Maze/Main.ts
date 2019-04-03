const shuffle = <T extends unknown[]>(array: T) => {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
};

const random = (min: number, max: number) => {
	return Math.floor(Math.random() * (max - min + 1)) + min;
};

interface cell {
	up?: cell;
	right?: cell;
	down?: cell;
	left?: cell;
}

class maze {
	public readonly cells: cell[] = [];

	public player: { x: number; y: number };
	public exit: { x: number; y: number };

	private canvas: HTMLCanvasElement;
	private context: CanvasRenderingContext2D;

	constructor(public readonly width: number, public readonly height: number) {
		for (let row = 0; row < height; ++row) {
			for (let column = 0; column < width; ++column) {
				this.cells[row * width + column] = {};
			}
		}

		this.canvas = document.getElementById('maze') as HTMLCanvasElement;
		this.context = this.canvas.getContext('2d')!;

		this.player = { x: random(0, this.width - 1), y: random(0, this.height - 1) };
		this.exit = { x: random(0, this.width - 1), y: random(0, this.height - 1) };
		const visited = {};
		this.visit(visited, 0, 0);
	}

	public draw() {
		this.context!.fillStyle = 'rgb(255, 255, 255)';
		this.context!.fillRect(0, 0, this.canvas!.width, this.canvas!.height);

		this.context.fillStyle = 'rgb(0, 0, 0)';
		for (let row = 0; row < this.height; ++row) {
			for (let column = 0; column < this.width; ++column) {
				const index = row * this.width + column;
				const x = this.canvas.width / 2 - 10 * (this.width / 2) + column * 10;
				const y = this.canvas.height / 2 - 10 * (this.height / 2) + row * 10;
				if (!this.cells[index].up) { this.context.fillRect(x, y, 10, 1); }
				if (!this.cells[index].right) { this.context.fillRect(x + 10, y, 1, 10); }
				if (!this.cells[index].down) { this.context.fillRect(x, y + 10, 10, 1); }
				if (!this.cells[index].left) { this.context.fillRect(x, y, 1, 10); }
			}
		}

		if (this.player) {
			this.context.fillStyle = 'rgb(255, 0, 0)';
			this.context.fillRect(
				this.canvas.width / 2 - 10 * (this.width / 2) + this.player.x * 10 + 3,
				this.canvas.height / 2 - 10 * (this.height / 2) + this.player.y * 10 + 3, 5, 5,
			);
		}

		if (this.exit) {
			this.context.fillStyle = 'rgb(0, 255, 0)';
			this.context.fillRect(
				this.canvas.width / 2 - 10 * (this.width / 2) + this.exit.x * 10 + 3,
				this.canvas.height / 2 - 10 * (this.height / 2) + this.exit.y * 10 + 3, 5, 5,
			);
		}
	}

	private visit(visited: { [index: number]: boolean }, row: number, column: number) {
		const index = row * this.width + column;
		visited[index] = true;

		const neighbours: number[] = [];
		if (row && !visited[index - this.width]) { neighbours.push(0); }
		if (column + 1 !== this.width && !visited[index + 1]) { neighbours.push(1); }
		if (row + 1 !== this.height && !visited[index + this.width]) { neighbours.push(2); }
		if (column && !visited[index - 1]) { neighbours.push(3); }

		if (neighbours.length) {
			shuffle(neighbours);

			for (const neighbour of neighbours) {
				if (neighbour === 0 && !visited[index - this.width]) {
					this.cells[row * this.width + column].up = this.cells[(row - 1) * this.width + column];
					this.cells[(row - 1) * this.width + column].down = this.cells[row * this.width + column];
					this.visit(visited, row - 1, column);
				} else if (neighbour === 1 && !visited[index + 1]) {
					this.cells[row * this.width + column].right = this.cells[row * this.width + column + 1];
					this.cells[row * this.width + column + 1].left = this.cells[row * this.width + column];
					this.visit(visited, row, column + 1);
				} else if (neighbour === 2 && !visited[index + this.width]) {
					this.cells[row * this.width + column].down = this.cells[(row + 1) * this.width + column];
					this.cells[(row + 1) * this.width + column].up = this.cells[row * this.width + column];
					this.visit(visited, row + 1, column);
				} else if (neighbour === 3 && !visited[index - 1]) {
					this.cells[row * this.width + column].left = this.cells[row * this.width + column - 1];
					this.cells[row * this.width + column - 1].right = this.cells[row * this.width + column];
					this.visit(visited, row, column - 1);
				}
			}
		}
	}
}

let m = new maze(10, 10);
m.draw();

window.addEventListener('keydown', (event) => {
	if (event.which === 38 && m.cells[m.player.y * m.width + m.player.x].up) {
		--m.player.y;
	} else if (event.which === 39 && m.cells[m.player.y * m.width + m.player.x].right) {
		++m.player.x;
	} else if (event.which === 40 && m.cells[m.player.y * m.width + m.player.x].down) {
		++m.player.y;
	} else if (event.which === 37 && m.cells[m.player.y * m.width + m.player.x].left) {
		--m.player.x;
	} else if (event.which === 69) {
		m = new maze(10, 10);
	} else if (event.which === 77) {
		m = new maze(20, 20);
	} else if (event.which === 72) {
		m = new maze(40, 40);
	}
	if (m.player.x === m.exit.x && m.player.y === m.exit.y) {
		m = new maze(m.width, m.height);
	}
	m.draw();
});
