import functions from "@google-cloud/functions-framework";

import { register } from "./register";
import { recurringScrape } from "./recurring-scrape.js";

functions.http("register", register);
functions.http("recurring-scrape", recurringScrape);
