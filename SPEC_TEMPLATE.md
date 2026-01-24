# 📐 Technical Specifications Template

Use this template to create detailed specs for each feature before implementation.

---

## Feature: [Feature Name]

**Phase:** [e.g., Phase 1.1 - Groq API Migration]  
**Priority:** [High / Medium / Low]  
**Estimated Time:** [e.g., 3-5 days]  
**Owner:** [Who's responsible for this]  
**Status:** [Planning / In Progress / Testing / Complete]

---

## 1. Overview

### What
[One sentence: What is this feature?]

### Why
[Why are we building this? What problem does it solve?]

### Success Metrics
- [ ] [Metric 1, e.g., API costs reduced by 40%]
- [ ] [Metric 2, e.g., Scraper success rate >95%]
- [ ] [Metric 3, e.g., Content quality maintained]

---

## 2. Requirements

### Functional Requirements
1. [What the feature must do]
2. [Another requirement]
3. [Another requirement]

### Non-Functional Requirements
- **Performance:** [e.g., API response time <200ms]
- **Reliability:** [e.g., Uptime >99.9%]
- **Security:** [e.g., API keys stored in secrets]
- **Scalability:** [e.g., Handle 100 articles per run]

---

## 3. Technical Design

### Architecture
```
[Diagram or description of how components interact]

Example:
Scraper → Groq API → Parse Response → Turso DB
   ↓ (if Groq fails)
   Gemini API → Parse Response → Turso DB
```

### Components to Change
| Component | File Path | Changes Required |
|-----------|-----------|------------------|
| [Component 1] | `path/to/file.py` | [What needs to change] |
| [Component 2] | `path/to/file.tsx` | [What needs to change] |

### New Components to Create
| Component | File Path | Purpose |
|-----------|-----------|---------|
| [New file 1] | `path/to/new-file.ts` | [What it does] |

### Database Changes
```sql
-- Example: Add a new column
ALTER TABLE posts ADD COLUMN neutrality_score INTEGER DEFAULT 0;

-- Example: Create a new table
CREATE TABLE saved_posts (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  post_id INTEGER NOT NULL,
  saved_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### API Changes
**New Endpoints:**
- `GET /api/trending` - Returns top 3 articles by clicks in last 24h

**Modified Endpoints:**
- `GET /api/posts` - Add optional `?neutrality_min=6` filter

### Environment Variables
```env
# New variables needed
GROQ_API_KEY=gsk_...
GROQ_MODEL=mixtral-8x7b-32768

# Modified variables
# (none)
```

---

## 4. Implementation Plan

### Phase 1: [Name]
**Goal:** [What this phase achieves]

**Tasks:**
1. [ ] [Task 1]
2. [ ] [Task 2]
3. [ ] [Task 3]

**Deliverables:**
- [ ] [File/component created]
- [ ] [Tests written]
- [ ] [Documentation updated]

### Phase 2: [Name]
**Goal:** [What this phase achieves]

**Tasks:**
1. [ ] [Task 1]
2. [ ] [Task 2]

**Deliverables:**
- [ ] [File/component created]

---

## 5. Testing Strategy

### Unit Tests
```python
# Example: Test Groq API integration
def test_groq_api_call():
    """Test that Groq API returns valid JSON"""
    result = call_groq_api("Test article content")
    assert "category" in result
    assert "summary" in result
    assert result["category"] in VALID_CATEGORIES
```

### Integration Tests
1. [ ] Test Groq API end-to-end
2. [ ] Test fallback to Gemini when Groq fails
3. [ ] Test database writes after curation

### Manual Testing Checklist
- [ ] [Feature works on localhost]
- [ ] [Feature works on staging]
- [ ] [Mobile responsive]
- [ ] [No console errors]
- [ ] [Performance acceptable (<2s page load)]

### Edge Cases to Test
1. [What happens if Groq API is down?]
2. [What happens if rate limit is hit?]
3. [What happens with malformed RSS feeds?]

---

## 6. Deployment Plan

### Pre-Deployment
- [ ] All tests pass
- [ ] Code review complete
- [ ] Documentation updated
- [ ] Staging tested
- [ ] Rollback plan ready

### Deployment Steps
1. [Step 1, e.g., Update GitHub secrets]
2. [Step 2, e.g., Merge to main]
3. [Step 3, e.g., Monitor logs]

### Post-Deployment
- [ ] Smoke test production
- [ ] Monitor error rates (Sentry)
- [ ] Check performance (Lighthouse)
- [ ] Verify metrics (analytics)

### Rollback Plan
**If something breaks:**
1. [Rollback step 1, e.g., Revert to previous deployment]
2. [Rollback step 2, e.g., Switch API key back to Gemini]
3. [Rollback step 3, e.g., Notify team]

---

## 7. Documentation

### User-Facing Changes
- [ ] Update README.md
- [ ] Update help docs (if any)
- [ ] Write blog post announcement (optional)

### Developer-Facing Changes
- [ ] Add comments to complex code
- [ ] Update API documentation
- [ ] Add examples to docs

### Configuration Changes
- [ ] Document new environment variables
- [ ] Update deployment guide
- [ ] Update troubleshooting guide

---

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| [Risk 1, e.g., Groq API quality lower than Gemini] | Medium | High | A/B test on 100 articles before full rollout |
| [Risk 2] | Low | Medium | [How we'll handle it] |

---

## 9. Dependencies

### Blocking (must complete first)
- [ ] [Dependency 1, e.g., Groq account setup]
- [ ] [Dependency 2]

### Blocked By (blocks other work)
- [ ] [What this feature blocks]

### External Dependencies
- [ ] [Third-party service, e.g., Groq API access]
- [ ] [Team dependencies, e.g., Design approval]

---

## 10. Acceptance Criteria

This feature is DONE when:

✅ **Functionality:**
- [ ] [Criteria 1, e.g., Scraper processes 20 articles using Groq]
- [ ] [Criteria 2, e.g., Fallback to Gemini works when Groq fails]
- [ ] [Criteria 3, e.g., Content quality is acceptable (manual review)]

✅ **Quality:**
- [ ] All tests pass
- [ ] No linting errors
- [ ] No TypeScript errors
- [ ] Lighthouse score >90

✅ **Documentation:**
- [ ] README updated
- [ ] Code comments added
- [ ] Environment variables documented

✅ **Deployment:**
- [ ] Works on staging
- [ ] Works on production
- [ ] No errors in Sentry
- [ ] Metrics look good

---

## 11. Timeline

| Phase | Duration | Start Date | End Date | Status |
|-------|----------|------------|----------|--------|
| Phase 1 | 2 days | [Date] | [Date] | ⏳ Pending |
| Phase 2 | 3 days | [Date] | [Date] | ⏳ Pending |
| Testing | 2 days | [Date] | [Date] | ⏳ Pending |
| **Total** | **7 days** | [Date] | [Date] | |

---

## 12. Review & Sign-Off

### Code Review
- [ ] Reviewed by: [Name]
- [ ] Date: [Date]
- [ ] Approved: Yes / No
- [ ] Comments: [Any feedback]

### QA Review
- [ ] Tested by: [Name]
- [ ] Date: [Date]
- [ ] Passed: Yes / No
- [ ] Issues found: [List]

### Product Sign-Off
- [ ] Approved by: [PM Name]
- [ ] Date: [Date]
- [ ] Ready for production: Yes / No

---

## 13. Post-Launch Review

**Completed:** [Date]  
**Deployment duration:** [X minutes]  
**Issues encountered:** [List any issues]

### Metrics (1 week post-launch)
- [Metric 1]: [Actual vs Expected]
- [Metric 2]: [Actual vs Expected]
- [Metric 3]: [Actual vs Expected]

### What Went Well ✅
1. [Thing 1]
2. [Thing 2]

### What Could Be Improved 🔄
1. [Thing 1]
2. [Thing 2]

### Lessons Learned 📚
1. [Lesson 1]
2. [Lesson 2]

---

## 14. Related Links

- **Jira/GitHub Issue:** [Link to issue]
- **Design Mockups:** [Figma/etc link]
- **API Documentation:** [Link]
- **Staging URL:** [https://staging.vibes.mk/feature-demo]

---

## Example: Filled Template for Groq Migration

See [SPEC_GROQ_MIGRATION.md](./specs/SPEC_GROQ_MIGRATION.md) for a complete example.

---

**How to Use This Template:**

1. Copy this file to `specs/SPEC_[FEATURE_NAME].md`
2. Fill out all sections
3. Review with team
4. Use as reference during implementation
5. Update as you build
6. Complete post-launch review

**Benefits:**
- ✅ Everyone knows what's being built
- ✅ Reduces back-and-forth with AI agents
- ✅ Catches issues before coding starts
- ✅ Great for onboarding new team members
- ✅ Historical record of decisions

---

Made with ❤️ for Vibes.mk
*Last Updated: January 2025*
