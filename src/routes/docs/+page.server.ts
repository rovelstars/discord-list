import type { PageServerLoad } from "./$types";
import { docs } from "virtual:docs";

export const load: PageServerLoad = async () => {
	return { docs };
};
