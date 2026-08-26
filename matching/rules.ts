export interface MatchRule {
  profilePath: string;
  autocomplete: string[];
  inputTypes?: string[];
  exact: string[];
  synonyms: string[];
  exclude?: string[];
}

export const MATCH_RULES: MatchRule[] = [
  {
    profilePath: "personal.email",
    autocomplete: ["email"],
    inputTypes: ["email"],
    exact: ["email", "email address", "candidate email", "contact email", "emailaddress", "candidateemail"],
    synonyms: ["email", "email address", "e mail", "candidate email", "contact email", "work email"],
    exclude: ["company email"]
  },
  {
    profilePath: "personal.phone",
    autocomplete: ["tel", "phone", "mobile"],
    inputTypes: ["tel"],
    exact: [
      "phone",
      "phone number",
      "mobile",
      "mobile number",
      "telephone",
      "contact number",
      "phonenumber",
      "mobilenumber"
    ],
    synonyms: ["phone", "phone number", "mobile", "mobile number", "telephone", "contact number", "cell"],
    exclude: ["company phone"]
  },
  {
    profilePath: "personal.firstName",
    autocomplete: ["given-name", "fname"],
    exact: [
      "first name",
      "firstname",
      "given name",
      "fname",
      "first",
      "preferred first name",
      "preferred name",
      "preferred firstname"
    ],
    synonyms: ["first name", "given name", "fname", "preferred first name", "preferred name"],
    exclude: ["first name of company"]
  },
  {
    profilePath: "personal.lastName",
    autocomplete: ["family-name", "lname"],
    exact: ["last name", "lastname", "surname", "family name", "lname", "last"],
    synonyms: ["last name", "surname", "family name", "lname"],
    exclude: []
  },
  {
    profilePath: "personal.middleName",
    autocomplete: ["additional-name"],
    exact: ["middle name", "middlename", "middle"],
    synonyms: ["middle name"]
  },
  {
    profilePath: "personal.fullName",
    autocomplete: ["name"],
    exact: [
      "full name",
      "fullname",
      "name",
      "candidate name",
      "legal name",
      "your name",
      "applicant name"
    ],
    synonyms: ["full name", "candidate name", "legal name", "applicant name"],
    exclude: [
      "first name",
      "last name",
      "middle name",
      "username",
      "user name",
      "file name",
      "filename",
      "company name",
      "organization name",
      "school name",
      "college name",
      "university name",
      "employer name",
      "project name",
      "brand name"
    ]
  },
  {
    profilePath: "links.linkedin",
    autocomplete: [],
    inputTypes: ["url"],
    exact: [
      "linkedin",
      "linkedin url",
      "linkedin profile",
      "linkedin profile url",
      "linkedinprofile"
    ],
    synonyms: ["linkedin", "linkedin url", "linkedin profile"]
  },
  {
    profilePath: "links.github",
    autocomplete: [],
    inputTypes: ["url"],
    exact: ["github", "github url", "github profile", "github profile url", "githubprofile"],
    synonyms: ["github", "github url", "github profile"]
  },
  {
    profilePath: "links.portfolio",
    autocomplete: ["url"],
    inputTypes: ["url"],
    exact: [
      "portfolio",
      "portfolio url",
      "personal website",
      "website",
      "website url",
      "personal site",
      "portfolio website"
    ],
    synonyms: ["portfolio", "personal website", "website", "website url", "personal site"],
    exclude: ["linkedin", "github"]
  },
  {
    profilePath: "experience[0].company",
    autocomplete: ["organization"],
    exact: [
      "current company",
      "current employer",
      "employer",
      "company",
      "organization",
      "organisation"
    ],
    synonyms: ["current company", "current employer", "employer", "company"],
    exclude: [
      "company website",
      "company url",
      "company email",
      "company phone",
      "company address",
      "company size"
    ]
  },
  {
    profilePath: "experience[0].title",
    autocomplete: ["organization-title"],
    exact: [
      "current job title",
      "current position",
      "job title",
      "position",
      "role",
      "title",
      "current role",
      "occupation title",
      "designation"
    ],
    synonyms: [
      "current job title",
      "current position",
      "job title",
      "position",
      "current role",
      "occupation title",
      "designation"
    ],
    exclude: ["page title", "resume title"]
  },
  {
    profilePath: "education[0].institution",
    autocomplete: [],
    exact: [
      "university",
      "college",
      "institution",
      "school",
      "university name",
      "college name",
      "institute",
      "institute name",
      "institute school"
    ],
    synonyms: ["university", "college", "institution", "school", "institute"],
    exclude: ["high school", "school name of children"]
  },
  {
    profilePath: "education[0].degree",
    autocomplete: [],
    exact: ["degree", "highest degree", "qualification", "degree name"],
    synonyms: ["degree", "highest degree", "qualification"]
  },
  {
    profilePath: "personal.address.city",
    autocomplete: ["address-level2"],
    exact: ["city", "current city", "town", "locality"],
    synonyms: ["city", "current city", "town"]
  },
  {
    profilePath: "personal.address.state",
    autocomplete: ["address-level1"],
    exact: ["state", "province", "region", "state province", "state/province"],
    synonyms: ["state", "province", "state province"]
  },
  {
    profilePath: "personal.address.postalCode",
    autocomplete: ["postal-code"],
    exact: [
      "zip",
      "zip code",
      "zipcode",
      "postal code",
      "postalcode",
      "postcode",
      "pin",
      "pin code",
      "pincode"
    ],
    synonyms: ["zip", "zip code", "postal code", "postcode", "pin code"]
  },
  {
    profilePath: "personal.address.country",
    autocomplete: ["country", "country-name"],
    exact: ["country", "country of residence", "country name"],
    synonyms: ["country", "country of residence"]
  },
  {
    profilePath: "personal.address.street",
    autocomplete: ["street-address", "address-line1"],
    exact: ["street", "street address", "address line 1", "address1"],
    synonyms: ["street address", "address line 1"]
  },
  {
    profilePath: "personal.address.fullAddress",
    autocomplete: ["street-address"],
    exact: ["address", "home address", "current address", "mailing address"],
    synonyms: ["home address", "current address", "mailing address"],
    exclude: ["email address", "ip address"]
  },
  {
    profilePath: "personal.location",
    autocomplete: [],
    exact: ["location", "current location"],
    synonyms: ["current location"],
    exclude: ["file location"]
  },
  {
    profilePath: "skills",
    autocomplete: [],
    exact: ["skills", "technical skills", "skill set", "skillset", "search and add skills"],
    synonyms: ["technical skills", "skill set", "add skills"]
  }
];

export const CONFIDENCE = {
  autocomplete: 0.99,
  inputType: 0.95,
  exactName: 0.95,
  exactLabel: 0.95,
  synonym: 0.9,
  placeholder: 0.85,
  contextual: 0.7,
  weak: 0.5
} as const;
