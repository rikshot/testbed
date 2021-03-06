import { Simulation } from 'Sandbox/Simulation.js';

const canvas = document.getElementById('sandbox') as HTMLCanvasElement;
const context = canvas.getContext('2d') as CanvasRenderingContext2D;

Simulation.Fetch('http://localhost:8000/build/src/json/stack.json').then((simulation) => {
    canvas.width = simulation.width;
    canvas.height = simulation.height;
    context.transform(1, 0, 0, -1, 0, canvas.height);

    const render = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        for (const entity of simulation.entities) {
            const world_shape = entity.shape.transform(entity.position, entity.orientation);
            context.beginPath();
            for (let i = world_shape.vertices.length - 1, j = 0; j < world_shape.vertices.length; i = j, ++j) {
                const vertex1 = world_shape.vertices[i];
                const vertex2 = world_shape.vertices[j];
                context.moveTo(vertex1.x, vertex1.y);
                context.lineTo(vertex2.x, vertex2.y);
            }
            context.strokeStyle = 'blue';
            context.stroke();

            const aabb = world_shape.bounding_box();
            context.strokeStyle = 'red';
            context.strokeRect(aabb.start.x, aabb.start.y, aabb.width, aabb.height);
        }

        for (const contact of simulation.contacts) {
            context.fillStyle = 'green';
            context.fillRect(contact.ap.x - 2.5, contact.ap.y - 2.5, 5, 5);
            context.fillRect(contact.bp.x - 2.5, contact.bp.y - 2.5, 5, 5);

            context.strokeStyle = 'green';
            context.beginPath();
            context.moveTo(contact.ap.x, contact.ap.y);
            const force_vector = contact.normal.mul(contact.force).add(contact.ap);
            context.lineTo(force_vector.x, force_vector.y);
            context.stroke();
        }

        context.strokeStyle = 'orange';
        simulation.quadtree.visit((quadtree) => {
            context.strokeRect(quadtree.rectangle.start.x, quadtree.rectangle.start.y, quadtree.rectangle.width, quadtree.rectangle.height);
        });
    };

    document.addEventListener('keydown', (event: KeyboardEvent) => {
        switch (event.key) {
            case 'Enter':
                event.preventDefault();
                simulation.step(time_step);
                render();
                break;

            case ' ':
                event.preventDefault();
                time = Date.now() / 1000;
                running = !running;
                if (running) {
                    window.requestAnimationFrame(run);
                }
                break;

            default:
                break;
        }
    });

    const time_step = 0.016;
    let time = Date.now() / 1000;
    let lag = 0;

    let running = false;

    const run = () => {
        if (running) {
            const new_time = Date.now() / 1000;
            const delta_time = new_time - time;
            time = new_time;
            lag += delta_time;

            while (lag >= time_step) {
                simulation.step(time_step);
                lag -= time_step;
            }

            render();
            window.requestAnimationFrame(run);
        }
    };

    simulation.step(time_step);
    render();
    window.requestAnimationFrame(run);
});
