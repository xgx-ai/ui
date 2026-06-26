export interface CoordConverter {
	screenToContent: (x: number, y: number) => { x: number; y: number };
	contentToScreen: (x: number, y: number) => { x: number; y: number };
	renderInOverlay?: boolean;
}

export interface PresenceCursor {
	x: number;
	y: number;
	isContentCoord?: boolean;
	renderInOverlay?: boolean;
	pageX?: number;
	pageY?: number;
	documentWidth?: number;
	documentHeight?: number;
}
