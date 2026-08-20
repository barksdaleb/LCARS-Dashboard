import fs from "fs";
import path from "path";

type Countermeasure = {
  id: string;
  name: string;
  category: string;
  status: string;
  startDate: string;
  endDate?: string;
  baselineCountermeasureId?: string;
  systems: string[];
  description: string;
  goal: string;
  before?: string;
  after?: string;
  analysisStatus: string;
  verdict: string | null;
};

type ContextEvent = {
  date: string;
  type: string;
  window?: string;
  tags: string[];
  description: string;
  analysisImpact: string;
};

type CountermeasureFile = {
  countermeasures: Countermeasure[];
};

type ContextFile = {
  events: ContextEvent[];
};

const OPS_DIR = path.join(
  process.cwd(),
  "data/ops"
);

function readJson<T>(
  filename: string
): T {
  const filePath = path.join(
    OPS_DIR,
    filename
  );

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Home Ops registry file missing: ${filename}`
    );
  }

  return JSON.parse(
    fs.readFileSync(filePath, "utf8")
  ) as T;
}

export function getCountermeasures():
  Countermeasure[] {
  return readJson<CountermeasureFile>(
    "countermeasures.json"
  ).countermeasures;
}

export function getContextEvents():
  ContextEvent[] {
  return readJson<ContextFile>(
    "context.json"
  ).events;
}
export function getCountermeasureById(
  id: string
): Countermeasure | undefined {
  return getCountermeasures().find(
    (item) => item.id === id
  );
}

export function getCountermeasuresForDate(
  date: string
): Countermeasure[] {
  return getCountermeasures().filter(
    (item) =>
      item.startDate <= date &&
      (!item.endDate || date <= item.endDate)
  );
}
export function getContextForDate(
  date: string
): ContextEvent[] {
  return getContextEvents().filter(
    (event) => event.date === date
  );
}

export function printOpsRegistry() {
  const countermeasures =
    getCountermeasures();
   

  const contextEvents =
    getContextEvents();

  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    "       HOME OPS REGISTRY"
  );
  console.log(
    "========================================"
  );

  console.log("");
  console.log(
    `Countermeasures: ${countermeasures.length}`
  );

  for (const item of countermeasures) {
    const verdict =
      item.verdict ?? "PENDING";

    console.log(
      `${item.startDate}  ${item.name}  [${verdict.toUpperCase()}]`
    );
  }

  console.log("");
  console.log(
    `Context Events: ${contextEvents.length}`
  );

  for (const event of contextEvents) {
    console.log(
      `${event.date}  ${event.tags.join(", ")}`
    );
  }

  console.log(
    "========================================"
  );
}

if (require.main === module) {
  printOpsRegistry();
}