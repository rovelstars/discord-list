declare module "virtual:docs" {
	export interface DocSection {
		slug: string;
		title: string;
		html: string;
	}
	export const docs: DocSection[];
}
