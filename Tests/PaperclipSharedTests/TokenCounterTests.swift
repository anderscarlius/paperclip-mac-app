import PaperclipShared
import Testing

@Test
func tokenCounterReturnsNonZeroEstimate() {
    let text = "Du är CTO. Granska arkitektur, prioritera arbete och delegera tydligt."
    #expect(TokenCounter.approximateCount(in: text) > 0)
}

@Test
func templateCatalogIncludesSoftwareCompany() {
    let template = CompanyTemplateCatalog.templates.first { $0.id == "software-company" }
    #expect(template != nil)
    #expect(template?.agents.count == 5)
}
