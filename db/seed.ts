import "@/lib/console-log";
// https://astro.build/db/seed
export default async function seed() {
	await fetch("http://localhost:4321/api/internals/seed");
}
