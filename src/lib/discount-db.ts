import { serviceClient } from "@/lib/db/clients";

/** Discount codes are only readable with the service role (customers must not be able to list them). */
export const publicOrServiceDb = () => serviceClient();
