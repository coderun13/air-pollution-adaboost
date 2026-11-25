import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import "../styles.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { title: "AirSense | Ensemble Air Quality Intelligence" },
      { name: "description", content: "Live air quality monitoring and ensemble AQI prediction for India." },
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" }
    ],
  }),
  component: Root,
});

function Root() {
  return <html lang="en"><head><HeadContent /></head><body><Outlet /><Scripts /></body></html>;
}
