import { RequestLogger, Role, Selector } from "testcafe";
import { writeFile } from "fs";

const config = {
  FORM_USER: process.env.FORM_USER || "",
  FORM_PWD: process.env.FORM_PWD || "",
  FORM_ID: process.env.FORM_ID || "",
  EXPORT_PATH: process.env.EXPORT_PATH || "./raw_export.csv"
}

const UserRole = Role("https://framaforms.org/user", async (t) => {
  return await t
    .typeText("#user-login #edit-name", config.FORM_USER)
    .typeText("#user-login #edit-pass", config.FORM_PWD)
    .click("#user-login #edit-submit");
});

const downloadFileUrl =
  `https://framaforms.org/node/${config.FORM_ID}/webform-results/download-file`;

const logger = RequestLogger(
  { url: downloadFileUrl, method: "GET" },
  {
    logResponseHeaders: true,
    logResponseBody: true,
    stringifyResponseBody: true,
  }
);

fixture`Export form csv data`
  .page`https://framaforms.org/node/${config.FORM_ID}/webform-results/download`
  .beforeEach(async (t) => {
    await t.useRole(UserRole);
  })
  .requestHooks(logger);

const formSelectorId = "#webform-results-download-form";
const delimiterSelect = Selector(`${formSelectorId} #edit-delimiter`);
const delimiterOption = delimiterSelect.find("option");

function formSelector(el: any) {
  return Selector(`${formSelectorId} ${el}`);
}

test("export", async (t) => {
  // selection du type d'export -> csv with delimiter
  await t.click(formSelector("#edit-format-delimited"));
  // selection du type de delimiter -> coma -> ,
  await t
    .click(delimiterSelect)
    .click(delimiterOption.withAttribute("value", "|"));

  await t.click(formSelector("#edit-header-keys-1--2"));

  // ouverture du pannel pour la selection des options de champs à exporter
  await t.click(formSelector("#edit-components a.fieldset-title"))

  const optionsToUnselect = [
    "#edit-components-info",
    "#edit-components-19", // details velo
    "#edit-components-5", // mail
    "#edit-components-12", // rue
    "#edit-components-3", // photo velo
    "#edit-components-18", // num série/bicycode
  ]

  await Promise.all(optionsToUnselect.map(async opt => await t.click(formSelector(opt))));
  
  await t.click(formSelector("#edit-submit"));
  await t
    .navigateTo(
      `https://framaforms.org/node/${config.FORM_ID}/webform-results/download-file`
    )
    .expect(
      logger.contains((r) => {
        if (r.response.statusCode !== 200) return false;

        const requestInfo = logger.requests[0];

        const downloadedFileName =
          requestInfo.response.headers["content-disposition"];

        if (!downloadedFileName) false;
        const downloadedFileContent = logger.requests[0].response.body;
        writeFile(config.EXPORT_PATH, downloadedFileContent, (err:any) => {
          if (err) {
            console.error(err);
            return;
          }
        });
        return true;
      })
    )
    .ok();
});
