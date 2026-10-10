
const BASE = (process.env.BASE_URL || "http://localhost:5000").replace(/\/$/, "");
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (run `npm run create-admin` first).");
  process.exit(1);
}

const tag = Date.now();
let passed = 0;
const failures = [];

async function call(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  try { json = await res.json(); } catch (_e) { /* non-JSON */ }
  return { status: res.status, json, data: json && json.data };
}

function check(name, condition, extra) {
  if (condition) { passed += 1; console.log(`  ✓ ${name}`); }
  else { failures.push(name); console.log(`  ✗ ${name}${extra ? "  -> " + JSON.stringify(extra) : ""}`); }
}
const section = (t) => console.log(`\n${t}`);
const future = (days) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);

async function login(email, password) {
  const r = await call("POST", "/auth/login", { body: { email, password } });
  return { token: r.data && r.data.token, user: r.data && r.data.user, status: r.status };
}

(async () => {
  const pw = "SmokeTest#12345";

  section("Auth");
  const admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  check("admin can log in", admin.status === 200 && admin.token, admin.status);
  if (!admin.token) { console.log("\nCannot continue without admin login."); process.exit(1); }
  check("login response has no password", !JSON.stringify(admin.user).includes("password"));
  check("GET /auth/me without token -> 401", (await call("GET", "/auth/me")).status === 401);
  check("GET /auth/me with token -> 200", (await call("GET", "/auth/me", { token: admin.token })).status === 200);
  check("wrong password -> 401", (await login(ADMIN_EMAIL, "wrong-password")).status === 401);
  const reg = await call("POST", "/auth/register", { body: { name: "Hacker", email: `h${tag}@t.com`, password: pw, role: "Admin" } });
  check("register cannot set role (rejected)", reg.status === 400, reg.status);

  section("User management");
  const mk = async (name, role, extra = {}) => (await call("POST", "/users", { token: admin.token, body: { name, email: `${name.toLowerCase().replace(/\s/g, "")}${tag}@t.com`, password: pw, role, ...extra } }));
  const mgrRes = await mk("Smoke Manager", "Sales Manager");
  check("admin creates manager", mgrRes.status === 201, mgrRes.json);
  const mgrId = mgrRes.data.user._id;
  const e1Res = await mk("Smoke Exec One", "Sales Executive", { reportsTo: mgrId });
  const e2Res = await mk("Smoke Exec Two", "Sales Executive");
  check("admin creates executives", e1Res.status === 201 && e2Res.status === 201);
  const e1Id = e1Res.data.user._id, e2Id = e2Res.data.user._id;
  const mgr = await login(mgrRes.data.user.email, pw);
  const e1 = await login(e1Res.data.user.email, pw);
  const e2 = await login(e2Res.data.user.email, pw);
  check("all three new users can log in", mgr.token && e1.token && e2.token);
  check("executive cannot list users -> 403", (await call("GET", "/users", { token: e1.token })).status === 403);
  const ul = await call("GET", "/users?role=Sales%20Executive&search=smoke&sortBy=name&sortOrder=asc", { token: admin.token });
  check("users list: filter + search + sort + pagination meta", ul.status === 200 && ul.data.items.length >= 2 && ul.data.pagination.pageSize === 20, ul.json);
  check("duplicate email -> 409", (await mk("Smoke Exec One", "Sales Executive")).status === 409);

  section("Lead CRUD, filters, pagination");
  const L = (extra = {}) => ({ name: "Lead Person", email: `lead${tag}@acme.com`, phone: "+91 9876543210", company: "Acme", source: "Website", priority: "High", description: "x", ...extra });
  const l1 = await call("POST", "/leads", { token: e1.token, body: L() });
  check("executive creates lead (auto-assigned to self)", l1.status === 201 && l1.data.lead.assignedTo._id === e1Id, l1.json);
  const leadId = l1.data.lead._id;
  check("bad email -> 400", (await call("POST", "/leads", { token: e1.token, body: L({ email: "nope" }) })).status === 400);
  check("bad source enum -> 400", (await call("POST", "/leads", { token: e1.token, body: L({ source: "Billboard" }) })).status === 400);
  check("bad ObjectId -> 400", (await call("GET", "/leads/123", { token: e1.token })).status === 400);
  const list = await call("GET", "/leads?page=1&pageSize=5&status=New&priority=High&source=Website&search=lead&sortBy=name&sortOrder=asc&from=2020-01-01", { token: e1.token });
  check("lead list with many filters -> 200", list.status === 200 && list.data.items.length >= 1, list.json);
  check("pagination metadata correct", list.data && list.data.pagination.page === 1 && list.data.pagination.pageSize === 5 && "total" in list.data.pagination && "totalPages" in list.data.pagination);
  check("pageSize > 100 -> 400", (await call("GET", "/leads?pageSize=500", { token: e1.token })).status === 400);

  section("Access control & assignment");
  check("other executive cannot read lead -> 403", (await call("GET", `/leads/${leadId}`, { token: e2.token })).status === 403);
  const e2list = await call("GET", "/leads", { token: e2.token });
  check("other executive's list does not contain it", e2list.status === 200 && !e2list.data.items.some((x) => x._id === leadId));
  check("executive cannot assign -> 403", (await call("PATCH", `/leads/${leadId}/assign`, { token: e1.token, body: { assignedTo: e2Id } })).status === 403);
  check("manager cannot assign to executive outside team -> 403", (await call("PATCH", `/leads/${leadId}/assign`, { token: mgr.token, body: { assignedTo: e2Id } })).status === 403);
  check("admin assigns lead to exec two", (await call("PATCH", `/leads/${leadId}/assign`, { token: admin.token, body: { assignedTo: e2Id } })).status === 200);
  check("manager (team) can no longer see lead owned outside team -> 403", (await call("GET", `/leads/${leadId}`, { token: mgr.token })).status === 403);
  check("admin reassigns back to exec one", (await call("PATCH", `/leads/${leadId}/assign`, { token: admin.token, body: { assignedTo: e1Id } })).status === 200);
  check("manager can see team lead", (await call("GET", `/leads/${leadId}`, { token: mgr.token })).status === 200);
  check("assigning to a manager is rejected -> 400", (await call("PATCH", `/leads/${leadId}/assign`, { token: admin.token, body: { assignedTo: mgrId } })).status === 400);

  section("Lead status & conversion");
  check("convert while New -> 400", (await call("POST", `/leads/${leadId}/convert`, { token: e1.token, body: { dealValue: 1000, expectedClosingDate: future(30) } })).status === 400);
  check("status -> Converted via PATCH rejected", (await call("PATCH", `/leads/${leadId}/status`, { token: e1.token, body: { status: "Converted" } })).status === 400);
  check("New -> Qualified", (await call("PATCH", `/leads/${leadId}/status`, { token: e1.token, body: { status: "Qualified" } })).status === 200);
  check("convert with 1990 closing date -> 400", (await call("POST", `/leads/${leadId}/convert`, { token: e1.token, body: { dealValue: 1000, expectedClosingDate: "1990-01-01" } })).status === 400);
  check("convert with value 0 -> 400", (await call("POST", `/leads/${leadId}/convert`, { token: e1.token, body: { dealValue: 0, expectedClosingDate: future(30) } })).status === 400);
  const conv = await call("POST", `/leads/${leadId}/convert`, { token: e1.token, body: { dealValue: 250000, probability: 30, expectedClosingDate: future(60), dealName: "Smoke Deal" } });
  check("convert qualified lead -> 200", conv.status === 200, conv.json);
  const customerId = conv.data && conv.data.customer._id, dealId = conv.data && conv.data.deal._id;
  check("customer references lead", conv.data && String(conv.data.customer.lead) === leadId);
  check("deal references lead + customer", conv.data && String(conv.data.deal.lead) === leadId && String(conv.data.deal.customer) === customerId);
  check("expectedRevenue = value*prob/100 (75000)", conv.data && conv.data.deal.expectedRevenue === 75000, conv.data && conv.data.deal.expectedRevenue);
  check("second convert -> 409", (await call("POST", `/leads/${leadId}/convert`, { token: e1.token, body: { dealValue: 1, expectedClosingDate: future(30) } })).status === 409);
  check("converted lead cannot be edited -> 400", (await call("PATCH", `/leads/${leadId}`, { token: e1.token, body: { priority: "Low" } })).status === 400);

  section("Customers");
  const cl = await call("GET", "/customers?search=lead&sortBy=name", { token: e1.token });
  check("customer list works & includes converted customer", cl.status === 200 && cl.data.items.some((c) => c._id === customerId), cl.json);
  check("other executive cannot read customer -> 403", (await call("GET", `/customers/${customerId}`, { token: e2.token })).status === 403);
  check("executive cannot delete customer -> 403", (await call("DELETE", `/customers/${customerId}`, { token: e1.token })).status === 403);

  section("Deals & business rules");
  const dl = await call("GET", `/deals?stage=Qualification&minAmount=1000&maxAmount=999999&closingFrom=${future(0)}&closingTo=${future(365)}`, { token: e1.token });
  check("deal list with stage/amount/closing filters", dl.status === 200 && dl.data.items.some((d) => d._id === dealId), dl.json);
  check("deal value 0 -> 400", (await call("POST", "/deals", { token: e1.token, body: { name: "Bad", customer: customerId, value: 0, expectedClosingDate: future(10) } })).status === 400);
  check("probability 150 -> 400", (await call("POST", "/deals", { token: e1.token, body: { name: "Bad", customer: customerId, value: 10, probability: 150, expectedClosingDate: future(10) } })).status === 400);
  check("closing date 20 years away -> 400", (await call("POST", "/deals", { token: e1.token, body: { name: "Bad", customer: customerId, value: 10, expectedClosingDate: future(7300) } })).status === 400);
  check("client cannot send expectedRevenue (strict)", (await call("POST", "/deals", { token: e1.token, body: { name: "Bad", customer: customerId, value: 10, expectedRevenue: 9999, expectedClosingDate: future(10) } })).status === 400);
  const d2 = await call("POST", "/deals", { token: e1.token, body: { name: "Second Deal", customer: customerId, value: 5000, probability: 50, expectedClosingDate: future(20) } });
  check("create second deal for customer", d2.status === 201, d2.json);
  const deal2 = d2.data && d2.data.deal._id;
  check("other executive cannot read deal -> 403", (await call("GET", `/deals/${dealId}`, { token: e2.token })).status === 403);
  check("other executive cannot move deal stage -> 403", (await call("PATCH", `/deals/${dealId}/stage`, { token: e2.token, body: { stage: "Discovery" } })).status === 403);
  check("Qualification -> Proposal", (await call("PATCH", `/deals/${dealId}/stage`, { token: e1.token, body: { stage: "Proposal" } })).status === 200);
  check("Lost without reason -> 400", (await call("PATCH", `/deals/${deal2}/stage`, { token: e1.token, body: { stage: "Lost" } })).status === 400);
  const lost = await call("PATCH", `/deals/${deal2}/stage`, { token: e1.token, body: { stage: "Lost", lostReason: "Chose a competitor on price" } });
  check("Lost with reason -> 200, probability forced to 0", lost.status === 200 && lost.data.deal.probability === 0, lost.json);
  check("closed Lost deal cannot reopen -> 400", (await call("PATCH", `/deals/${deal2}/stage`, { token: e1.token, body: { stage: "Discovery" } })).status === 400);
  const won = await call("PATCH", `/deals/${dealId}/stage`, { token: e1.token, body: { stage: "Won" } });
  check("Won -> 200, probability 100, revenue = value", won.status === 200 && won.data.deal.probability === 100 && won.data.deal.expectedRevenue === 250000, won.json);
  check("closed Won deal cannot go back -> 400", (await call("PATCH", `/deals/${dealId}/stage`, { token: e1.token, body: { stage: "Negotiation" } })).status === 400);
  check("closed deal fields locked -> 400", (await call("PATCH", `/deals/${dealId}`, { token: e1.token, body: { value: 1 } })).status === 400);

  section("Activities");
  const act = await call("POST", "/activities", { token: e1.token, body: { type: "Follow-up", title: "Call back", dueDate: new Date(Date.now() - 864e5).toISOString(), relatedTo: { entityType: "Customer", entityId: customerId } } });
  check("create follow-up", act.status === 201, act.json);
  const actId = act.data && act.data.activity ? act.data.activity._id : null;
  const got = actId && await call("GET", `/activities/${actId}`, { token: e1.token });
  check("past-due Pending activity is reported as Overdue", got && got.data.activity.status === "Overdue", got && got.json);
  const ovl = await call("GET", "/activities?status=Overdue", { token: e1.token });
  check("overdue filter returns it", ovl.status === 200 && actId && ovl.data.items.some((a) => a._id === actId));
  check("other executive cannot read activity -> 403", actId && (await call("GET", `/activities/${actId}`, { token: e2.token })).status === 403);
  check("cannot attach activity to someone else's lead/customer -> 403", (await call("POST", "/activities", { token: e2.token, body: { type: "Note", title: "sneaky", relatedTo: { entityType: "Customer", entityId: customerId } } })).status === 403);
  const done = actId && await call("PATCH", `/activities/${actId}/complete`, { token: e1.token });
  check("complete activity", done && done.status === 200 && done.data.activity.status === "Completed" && done.data.activity.completedAt, done && done.json);
  check("complete twice -> 400", actId && (await call("PATCH", `/activities/${actId}/complete`, { token: e1.token })).status === 400);

  section("Timeline");
  const tl = await call("GET", `/timeline/Lead/${leadId}`, { token: e1.token });
  const actions = tl.data ? tl.data.items.map((i) => i.action) : [];
  check("lead timeline has created/assigned/status/converted", ["Lead created", "Lead assigned", "Lead reassigned", "Lead status changed", "Lead converted"].every((a) => actions.includes(a)), actions);
  const tc = await call("GET", `/timeline/Customer/${customerId}`, { token: e1.token });
  const cActions = tc.data ? tc.data.items.map((i) => i.action) : [];
  check("customer timeline has deal stage/won/lost events", ["Deal won", "Deal lost", "Follow-up created", "Follow-up completed"].every((a) => cActions.includes(a)), cActions);
  check("timeline blocked for inaccessible entity -> 403", (await call("GET", `/timeline/Lead/${leadId}`, { token: e2.token })).status === 403);

  section("Dashboard");
  const sum = await call("GET", "/dashboard", { token: admin.token });
  const keys = ["totalLeads", "newLeads", "qualifiedLeads", "convertedLeads", "totalCustomers", "totalDeals", "openDeals", "wonDeals", "lostDeals", "totalRevenue", "expectedRevenue", "conversionRate", "pendingActivities", "overdueActivities"];
  check("summary has all 14 metrics", sum.status === 200 && keys.every((k) => k in sum.data), sum.json);
  const pipe = await call("GET", "/dashboard/pipeline", { token: admin.token });
  check("pipeline returns 6 stages", pipe.status === 200 && pipe.data.stages.length === 6);
  const e1sum = await call("GET", "/dashboard", { token: e1.token });
  check("executive dashboard is scoped (1 customer, 2 deals, 1 won, 1 lost)", e1sum.data && e1sum.data.totalCustomers === 1 && e1sum.data.totalDeals === 2 && e1sum.data.wonDeals === 1 && e1sum.data.lostDeals === 1, e1sum.data);
  const msum = await call("GET", "/dashboard", { token: mgr.token });
  check("manager dashboard scoped to team (not whole company)", msum.status === 200 && msum.data.totalCustomers === 1 && msum.data.overdueActivities === 0 && msum.data.pendingActivities === 0, msum.data);
  check("executive cannot see team performance -> 403", (await call("GET", "/dashboard/team", { token: e1.token })).status === 403);
  const team = await call("GET", "/dashboard/team", { token: mgr.token });
  check("manager sees team performance", team.status === 200 && team.data.members.length >= 2, team.json);

  section("Security / errors");
  const nf = await call("GET", "/nope", { token: admin.token });
  check("unknown route -> 404 with success:false", nf.status === 404 && nf.json.success === false);
  check("settings update is Admin-only", (await call("PUT", "/settings", { token: e1.token, body: { companyName: "X Corp" } })).status === 403);
  check("cannot delete user who has records -> 409", (await call("DELETE", `/users/${e1Id}`, { token: admin.token })).status === 409);
  check("admin deactivates exec two", (await call("PATCH", `/users/${e2Id}/status`, { token: admin.token, body: { isActive: false } })).status === 200);
  check("deactivated user's token stops working -> 401", (await call("GET", "/auth/me", { token: e2.token })).status === 401);
  check("inactive user cannot log in -> 403", (await login(e2Res.data.user.email, pw)).status === 403);
  check("cannot assign lead to inactive user -> 400", (await call("PATCH", `/leads/${(await call("POST", "/leads", { token: e1.token, body: L({ email: `l2${tag}@a.com` }) })).data.lead._id}/assign`, { token: admin.token, body: { assignedTo: e2Id } })).status === 400);
  check("logout -> 200", (await call("POST", "/auth/logout", { token: e1.token })).status === 200);
  check("token invalid after logout -> 401", (await call("GET", "/auth/me", { token: e1.token })).status === 401);

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) { console.log("Failed:\n - " + failures.join("\n - ")); process.exit(1); }
})().catch((e) => { console.error("Smoke test crashed:", e); process.exit(1); });
