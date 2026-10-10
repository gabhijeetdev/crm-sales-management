const Setting = require("../models/Setting");

async function getSettings() {
  let settings = await Setting.findOne();
  if (!settings) settings = await Setting.create({});
  return settings;
}

async function updateSettings(payload) {
  const settings = await getSettings();
  Object.assign(settings, payload);
  await settings.save();
  return settings;
}

module.exports = { getSettings, updateSettings };
