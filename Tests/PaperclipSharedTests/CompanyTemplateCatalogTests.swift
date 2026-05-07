import XCTest
@testable import PaperclipShared

final class CompanyTemplateCatalogTests: XCTestCase {
    func testOnboardingFriendlyTemplatesExist() {
        let ids = Set(CompanyTemplateCatalog.templates.map(\.id))

        XCTAssertTrue(ids.contains("solo-founder"))
        XCTAssertTrue(ids.contains("software-company"))
        XCTAssertTrue(ids.contains("marketing-agency"))
        XCTAssertTrue(ids.contains("research-lab"))
        XCTAssertTrue(ids.contains("personal-assistant"))
    }
}
