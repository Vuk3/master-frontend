# Object Detection Dashboard

The React frontend of my master's thesis, a system that runs the same image through a YOLOv8m
model in Python and an ML.NET model in .NET and compares the two. It sends an image through the
[gateway](https://github.com/Vuk3/master-gateway-api) to one service or both at once, draws every
detection over the image and sets the two answers side by side.

The full write-up, with the results: [vukcvetkovic.com/projects/object-detection](https://vukcvetkovic.com/projects/object-detection/)

## What it does

- Runs the Python service, the .NET service, or both together on the same image
- Picks the model on each side from the catalog the gateway passes through
- Filters the detections by a minimum confidence, 50% to start, without calling the services again
- Compares the two answers: objects found on each side, the difference in count, the average
  confidence and its difference
- Checks the health of the gateway and of both services from the page
- English and Serbian, light and dark theme

## The system

| Repository | Role |
| --- | --- |
| **master-frontend** | React dashboard: sends an image, draws both results side by side |
| [master-gateway-api](https://github.com/Vuk3/master-gateway-api) | NestJS gateway, the one address the frontend calls |
| [master-python-api](https://github.com/Vuk3/master-python-api) | FastAPI service running the YOLOv8m models |
| [master-dotnet-api](https://github.com/Vuk3/master-dotnet-api) | ASP.NET Core service running the ML.NET models |

## Running it

Node 20, with the gateway running:

```bash
npm install
cp .env.example .env
npm run dev
```

`VITE_GATEWAY_BASE_URL` in `.env` is the gateway's address, `http://localhost:3000` by default.
The dashboard opens on `http://localhost:5173`, the origin the gateway's `.env.example` allows.

`npm run build` type-checks the project and writes the production build to `dist/`.

Built with React 18, TypeScript and Vite.
