import { Collector } from "./collector";

export async function runCollectors(
  collectors: Collector[]
) {
  for (const collector of collectors) {

    if (!(await collector.isAvailable())) {
      continue;
    }

    await collector.collect();
  }
}