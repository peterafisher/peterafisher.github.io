class Plane {
    constructor(id) {
        this.ID = id
        this.position = createVector(random(0, width), random(0, height));
        this.direction = p5.Vector.random2D();
        this.velocity = createVector();
    }

    update() {
        this.velocity.x = this.direction.x * speedSlider.value() / 100;
        this.velocity.y = this.direction.y * speedSlider.value() / 100;
        this.direction.rotate(steeringSlider.value() / 400);
        this.position.add(this.velocity);
        if (this.position.x > width) {
            this.position.x = 0;
        }
        if (this.position.x < 0) {
            this.position.x = width;
        }
        if (this.position.y > height) {
            this.position.y = 0;
        }
        if (this.position.y < 0) {
            this.position.y = height;
        }
    }

    show() {
        // Draw triangle at correct position and rotation
        push();
        strokeWeight(3);
        noFill();
        rectMode(CENTER);
        translate(this.position.x, this.position.y);
        rotate(createVector(0, -1).angleBetween(this.direction));
        triangle(-5, 10, 0, -10, 5, 10);
        pop();

        // Draw label on top at correct position (no rotation)
        push();
        stroke(0);
        fill(255);
        translate(this.position.x, this.position.y);
        text(this.ID, 15, 15);
        pop();
    }
}