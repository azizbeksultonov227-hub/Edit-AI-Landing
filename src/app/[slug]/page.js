import Home from "../page";

export default async function ProjectRoute({ params }) {
  const { slug } = await params;

  return <Home initialSlug={slug} />;
}
