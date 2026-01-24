# 📐 Technical Specification: Groq API Migration

**Phase:** Phase 1.1 - Groq API Migration  
**Priority:** HIGH  
**Estimated Time:** 3-5 days  
**Owner:** Backend Team / AI Agent  
**Status:** Planning

---

## 1. Overview

### What
Migrate the AI curation service from Google Gemini to Groq API while maintaining a fallback to Gemini for reliability.

### Why
- **Problem:** Gemini API hitting rate limits (429 errors), causing scraper failures
- **Solution:** Groq offers higher rate limits and faster inference
- **Business Impact:** Reduce API costs by 40%, ensure scraper reliability

### Success Metrics
- [x] API costs reduced by >40%
- [x] Scraper success rate maintained at >95%
- [x] Content quality maintained (subjective review of 50 articles)
- [x] Average curation latency reduced by >30%

---

## 2. Requirements

### Functional Requirements
1. Scraper must successfully use Groq API for AI curation
2. Must fall back to Gemini if Groq fails (rate limit, downtime, etc.)
3. Must log which model was used for each article
4. Must maintain same output format (category, summary, hero_score, etc.)
5. Must support model priority list for graceful degradation

### Non-Functional Requirements
- **Performance:** API response time <500ms (target: 100-200ms)
- **Reliability:** Overall success rate >95% (with fallback)
- **Security:** API keys stored in GitHub Secrets, never committed
- **Scalability:** Handle 20 articles per scraper run
- **Observability:** Detailed logging of API usage and failures

---

## 3. Acceptance Criteria

This feature is DONE when:

✅ **Functionality:**
- [ ] Scraper processes 20 articles using Groq successfully
- [ ] Fallback to Gemini works when Groq fails (tested)
- [ ] Content quality is acceptable (manual review of 50 articles)
- [ ] Logs show which model was used for each article

✅ **Quality:**
- [ ] No Python linting errors: `pylint curator_2.py`
- [ ] All edge cases tested
- [ ] Fallback mechanism verified

✅ **Documentation:**
- [ ] README updated with Groq setup instructions
- [ ] Code comments explain Groq integration
- [ ] Environment variables documented

✅ **Deployment:**
- [ ] Works in production (first scraper run succeeds)
- [ ] No increase in error rates
- [ ] API costs reduced (verified after 1 week)

---

For full technical specification, see complete version in project documentation.

Made with ❤️ for Vibes.mk
*Last Updated: January 2025*
