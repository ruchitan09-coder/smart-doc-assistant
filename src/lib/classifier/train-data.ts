import type { DocumentClass } from "./labels";

// Small hand-written seed dataset so the in-app classifier has something to
// train on out of the box, with zero external files or network calls. This
// is intentionally small (a few dozen examples per class) -- good enough for
// a working demo/starter model, not a production-grade classifier. Swap in
// a larger labeled dataset (or point MODEL_API_URL at the Python service in
// ml/, trained on ml/data) to improve real-world accuracy. See ml/README.md.

export interface LabeledExample {
  text: string;
  label: DocumentClass;
}

export const TRAINING_EXAMPLES: LabeledExample[] = [
  // invoice
  { label: "invoice", text: "Invoice number INV-2041 amount due $1,250.00 payment terms net 30 days please remit payment to the address below" },
  { label: "invoice", text: "Bill to customer account total balance due invoice date due date itemized charges quantity unit price subtotal tax total amount" },
  { label: "invoice", text: "Please find attached invoice for services rendered this month payment due within 30 days of receipt bank transfer details enclosed" },
  { label: "invoice", text: "Invoice summary line items description quantity rate amount grand total outstanding balance overdue payment reminder" },
  { label: "invoice", text: "Tax invoice GST amount billing address shipping address purchase order number payment due upon receipt" },
  { label: "invoice", text: "Statement of charges for consulting hours billed at hourly rate total invoice amount payable within thirty days" },
  { label: "invoice", text: "Monthly subscription invoice charge card ending in 4242 next billing date renewal amount due" },
  { label: "invoice", text: "Freight invoice shipment charges handling fee total due remit payment via wire transfer reference invoice number" },

  // contract
  { label: "contract", text: "This agreement is entered into by and between the parties hereinafter referred to as the client and the contractor" },
  { label: "contract", text: "Terms and conditions of this contract shall remain in effect for a period of twelve months from the effective date" },
  { label: "contract", text: "The parties hereby agree to the following terms termination clause governing law indemnification and confidentiality obligations" },
  { label: "contract", text: "Service agreement scope of work deliverables payment schedule termination for convenience and breach of contract provisions" },
  { label: "contract", text: "Non disclosure agreement between the disclosing party and the receiving party regarding confidential information" },
  { label: "contract", text: "Lease agreement tenant landlord monthly rent security deposit renewal option and default remedies" },
  { label: "contract", text: "Employment contract job title compensation benefits probationary period termination notice period non compete clause" },
  { label: "contract", text: "This master services agreement governs the relationship between vendor and customer including liability limitations" },

  // research_paper
  { label: "research_paper", text: "Abstract this paper presents a novel approach to the problem introduction related work methodology experiments results conclusion" },
  { label: "research_paper", text: "We propose a new algorithm and evaluate it on several benchmark datasets our experiments show significant improvement over baselines" },
  { label: "research_paper", text: "In this study we investigate the effects of the independent variable on the dependent variable using a controlled experiment" },
  { label: "research_paper", text: "Literature review prior work has explored related approaches however our method differs in the following key ways" },
  { label: "research_paper", text: "The results were statistically significant p value less than 0.05 we discuss the implications for future research" },
  { label: "research_paper", text: "This dissertation examines theoretical framework hypothesis testing data collection methodology and statistical analysis" },
  { label: "research_paper", text: "Peer reviewed journal article citation references bibliography figures tables appendix supplementary materials" },
  { label: "research_paper", text: "Our contribution is threefold first we introduce a new dataset second a novel model architecture third comprehensive evaluation" },

  // resume
  { label: "resume", text: "Curriculum vitae work experience education skills software engineer five years experience in full stack development" },
  { label: "resume", text: "Objective seeking a challenging position professional summary key skills relevant experience references available upon request" },
  { label: "resume", text: "Bachelor of science in computer science graduated with honors relevant coursework internship experience projects" },
  { label: "resume", text: "Work history senior developer led a team of engineers responsible for architecture design and code reviews" },
  { label: "resume", text: "Skills proficient in python javascript react node.js sql project management communication and leadership" },
  { label: "resume", text: "Professional experience marketing manager increased revenue by 30 percent managed cross functional teams" },
  { label: "resume", text: "Education certifications awards volunteer experience languages spoken contact information linkedin profile" },
  { label: "resume", text: "Career objective detail oriented accountant with strong analytical skills and experience in financial reporting" },

  // report
  { label: "report", text: "Executive summary this quarterly report covers key performance indicators revenue growth and operational highlights" },
  { label: "report", text: "Annual report financial highlights balance sheet income statement cash flow statement shareholder letter" },
  { label: "report", text: "Progress report status update on project milestones completed tasks upcoming deliverables risks and issues" },
  { label: "report", text: "Market research report analysis of industry trends competitive landscape and growth opportunities" },
  { label: "report", text: "Incident report summary of the event root cause analysis corrective actions and recommendations" },
  { label: "report", text: "Performance review report employee achievements areas for improvement goals for next quarter" },
  { label: "report", text: "Audit report findings observations recommendations management response and follow up actions" },
  { label: "report", text: "Sales report monthly figures by region product category year over year comparison and forecast" },

  // assignment
  { label: "assignment", text: "Homework assignment question 1 solve for x show your work question 2 explain the concept in your own words" },
  { label: "assignment", text: "Assignment instructions due date submission guidelines rubric grading criteria late penalty policy" },
  { label: "assignment", text: "Problem set exercises chapter review questions answer each question completely and show all calculations" },
  { label: "assignment", text: "Essay assignment write a 1500 word essay on the assigned topic cite at least three academic sources" },
  { label: "assignment", text: "Lab assignment procedure materials needed observations data table analysis questions conclusion" },
  { label: "assignment", text: "Group project assignment each team member is responsible for a section presentation due next week" },
  { label: "assignment", text: "Coding assignment implement the function according to the specification unit tests must pass submit via github" },
  { label: "assignment", text: "Reading assignment chapters 3 through 5 prepare discussion questions for next class quiz on friday" },

  // policy
  { label: "policy", text: "Company policy employees must adhere to the following guidelines regarding conduct attendance and workplace safety" },
  { label: "policy", text: "Privacy policy we collect and use personal information as described below your rights and choices data retention" },
  { label: "policy", text: "Remote work policy eligibility requirements equipment expectations core hours and communication guidelines" },
  { label: "policy", text: "Code of conduct policy anti harassment discrimination reporting procedures disciplinary actions" },
  { label: "policy", text: "Leave of absence policy vacation sick leave parental leave eligibility and approval process" },
  { label: "policy", text: "Data security policy access control encryption incident response and acceptable use of company systems" },
  { label: "policy", text: "Refund and return policy conditions for returns time limit restocking fee and exceptions" },
  { label: "policy", text: "Expense reimbursement policy eligible expenses receipt requirements approval workflow and submission deadline" },

  // receipt
  { label: "receipt", text: "Receipt thank you for your purchase item quantity price subtotal tax total paid change due" },
  { label: "receipt", text: "Payment receipt transaction id date time amount paid method of payment cardholder name authorization code" },
  { label: "receipt", text: "Store receipt cashier register number items purchased total amount tendered thank you come again" },
  { label: "receipt", text: "Rent receipt received from tenant the sum of monthly rent payment for the period landlord signature" },
  { label: "receipt", text: "Donation receipt thank you for your generous contribution tax deductible amount organization name" },
  { label: "receipt", text: "Restaurant receipt table server order items subtotal gratuity total card ending in digits" },
  { label: "receipt", text: "Parking receipt entry time exit time duration amount paid lot number license plate" },
  { label: "receipt", text: "Gas station fuel receipt gallons price per gallon total amount pump number transaction time" },

  // legal_document
  { label: "legal_document", text: "In the matter of before the court plaintiff versus defendant case number motion filed pursuant to statute" },
  { label: "legal_document", text: "Power of attorney the undersigned hereby appoints attorney in fact to act on behalf of the principal" },
  { label: "legal_document", text: "Last will and testament the testator being of sound mind hereby declares this to be the last will revoking prior wills" },
  { label: "legal_document", text: "Affidavit I the undersigned being duly sworn depose and state the following facts under penalty of perjury" },
  { label: "legal_document", text: "Notice of legal proceedings you are hereby notified that a complaint has been filed against you in the above case" },
  { label: "legal_document", text: "Terms of service governing law jurisdiction limitation of liability arbitration clause user obligations" },
  { label: "legal_document", text: "Court order it is hereby ordered adjudged and decreed that the following relief is granted" },
  { label: "legal_document", text: "Trademark registration application classes of goods and services specimen of use declaration" },

  // business_document
  { label: "business_document", text: "Business plan executive summary market analysis competitive advantage financial projections funding request" },
  { label: "business_document", text: "Meeting minutes attendees agenda items discussed decisions made action items and next meeting date" },
  { label: "business_document", text: "Memo to all staff from management regarding the upcoming change in office hours effective next month" },
  { label: "business_document", text: "Request for proposal scope of work submission requirements evaluation criteria and proposal deadline" },
  { label: "business_document", text: "Purchase order supplier name delivery address item description quantity unit price total order value" },
  { label: "business_document", text: "Company newsletter announcing new product launch team updates and upcoming events for employees" },
  { label: "business_document", text: "Standard operating procedure step by step instructions responsible roles and quality checkpoints" },
  { label: "business_document", text: "Partnership proposal outlining mutual benefits proposed terms and next steps for collaboration" },
];
