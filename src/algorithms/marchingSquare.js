// Marching Square algorithm: an algorithm that generates contours (isolines) for a two-dimensional scalar field.
// https://en.wikipedia.org/wiki/Marching_squares
//
// Input:
// discreteData: A 2D array storing values on a grid
// isoValue: the value to draw the isoline on
// gridSize: size of each grid
//
// Output:
// An array of isoline segments in the format of
// [
//	[ [x1, y1], [x2, y2] ],
// 	[ [x1, y1], [x2, y2] ]...
// ]

// Note: in this function, the y coordinate increases downwards.

export function marchingSquare(
	discreteData,
	isoValue,
	lngStart,
	latStart,
	gridSize
) {
	let columnN = discreteData[0].length;
	let rowN = discreteData.length;
	let squareMatrix = [];
	let result = [];

	for (let i = 0; i < rowN - 1; i++) {
		squareMatrix.push([]);
		for (let j = 0; j < columnN - 1; j++) {
			// Drawing isoline for the following square surrounded by four discreteData values:
			//   (i,j) ┌ ─ ┐ (i+1,j)
			//         │   │
			// (i,j+1) └ ─ ┘ (i+1,j+1)

			// Initialize the square
			squareMatrix[i].push(new Square(j, i));

			// Store corner values
			squareMatrix[i][j].cornerValue = [
				discreteData[i + 1][j],
				discreteData[i + 1][j + 1],
				discreteData[i][j + 1],
				discreteData[i][j],
			];

			// Compare the corner values to the iso-value to make a binary representaion.
			squareMatrix[i][j].getCornerBinary(isoValue);

			// Look up the binary representaion in basicLineTable to determine an isoline pattern.
			squareMatrix[i][j].getBasicLines(isoValue);

			// Use corner values and linear interpolation to get more precise isoline segments with
			// actual coordinates, and then push those segments into result.
			squareMatrix[i][j].getActualLines(
				result,
				lngStart,
				latStart,
				gridSize,
				isoValue
			);
		}
	}

	return result;
}

class Square {
	constructor(column, row) {
		this.column = column;
		this.row = row;
		this.cornerValue = null;
		this.cornerBinary = null;
		this.basicLines = [];
	}

	getCornerBinary(isoValue) {
		if (this.cornerValue === null) {
			return;
		}
		this.cornerBinary = this.cornerValue.map((val) => {
			return val > isoValue ? 1 : 0;
		});
	}

	getBasicLines(isoValue) {
		if (this.cornerBinary === null) {
			return;
		}

		// Look up the binary representaion in basicLineTable to determine an isoline pattern.
		let sum = 0;
		this.cornerBinary.forEach((val, ind) => {
			sum += val * 2 ** ind;
		});
		this.basicLines = basicLineTable[sum];

		// Consider saddle points
		if (sum === 5) {
			if (this.cornerValue.reduce((a, b) => a + b) / 4 >= isoValue) {
				this.basicLines = [
					[0, 3],
					[1, 2],
				];
			} else {
				this.basicLines = [
					[0, 1],
					[2, 3],
				];
			}
		} else if (sum === 10) {
			if (this.cornerValue.reduce((a, b) => a + b) / 4 >= isoValue) {
				this.basicLines = [
					[0, 1],
					[2, 3],
				];
			} else {
				this.basicLines = [
					[0, 3],
					[1, 2],
				];
			}
		}
	}

	getActualLines(result, lngStart, latStart, length, isoValue) {
		// Calculate the linear interpolation values for each side.
		// Note: how each side is ordered:
		// ┌ 2 ┐
		// 3   1
		// └ 0 ┘
		let interpoValues = [];
		for (let k = 0; k < 4; k++) {
			let interpolate_tmp = linearInterpolation(
				this.cornerValue[k],
				this.cornerValue[(k + 1) % 4],
				isoValue
			);
			interpoValues.push(interpolate_tmp);
		}

		// Flip the interpolation values for side 1 and side 2.
		interpoValues[1] = 1 - interpoValues[1];
		interpoValues[2] = 1 - interpoValues[2];

		// Turn basic lines into actual lines with coordinates.
		this.basicLines.forEach((l) => {
			let newLine = [
				[
					lngStart +
						(this.column +
							lineEndPoints[l[0]][0] +
							(l[0] === 0 || l[0] === 2
								? interpoValues[l[0]]
								: 0.5)) *
							length,
					latStart +
						(this.row +
							lineEndPoints[l[0]][1] +
							(l[0] === 1 || l[0] === 3
								? interpoValues[l[0]]
								: 0.5)) *
							length,
				],
				[
					lngStart +
						(this.column +
							lineEndPoints[l[1]][0] +
							(l[1] === 0 || l[1] === 2
								? interpoValues[l[1]]
								: 0.5)) *
							length,
					latStart +
						(this.row +
							lineEndPoints[l[1]][1] +
							(l[1] === 1 || l[1] === 3
								? interpoValues[l[1]]
								: 0.5)) *
							length,
				],
			];
			result.push(newLine);
		});
	}
}

let basicLineTable = [
	[],
	[[0, 3]],
	[[0, 1]],
	[[1, 3]],
	[[1, 2]],
	[
		[0, 1],
		[2, 3],
	],
	[[0, 2]],
	[[2, 3]],
	[[2, 3]],
	[[0, 2]],
	[
		[0, 3],
		[1, 2],
	],
	[[1, 2]],
	[[1, 3]],
	[[0, 1]],
	[[0, 3]],
	[],
];

let lineEndPoints = [
	[0.5, 1],
	[1, 0.5],
	[0.5, 0],
	[0, 0.5],
];

function linearInterpolation(v1, v2, v_iso) {
	if (v2 === v1) {
		return Infinity;
	}
	return (v_iso - v1) / (v2 - v1);
}

// Linear interpolation examples:
// v_iso === v1        -> return 0
// v_iso === v2        -> return 1
// v_iso === (v1+v2)/2 -> return 0.5
