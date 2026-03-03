import { useTranslation } from "react-i18next"

export function TrustedCompanies() {
  const { t } = useTranslation()
  const companies = [
    "Netflix", "Volkswagen", "Box", "NetApp", "Eventbrite"
  ]

  return (
    <section className="py-12 px-4 bg-gray-100">
      <div className="container mx-auto text-center">
        <p className="text-gray-600 mb-8">
          {t('trusted.text')}
        </p>
        
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
          {companies.map((company, index) => (
            <div key={index} className="text-gray-400 font-bold text-xl md:text-2xl hover:text-gray-600 transition-colors">
              {company}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}